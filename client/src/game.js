import { io } from 'socket.io-client';
import { Config } from '../../shared/configuration.js';
import { createLights } from './lights.js';
import { Input } from './input.js';
import { setupTouchControls } from './touchControls.js';
import { Player } from './player.js';
import { LocalPlayer } from './localPlayer.js'
import { HUD } from './hud.js';
import { RoadClient } from './roadClient.js';
import * as HELPERS from '../../shared/helpers.js';
import { SnapshotsBuffer } from './snapshotsBuffer.js';
import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';

const INTERPOLATION_DELAY = 100;
const MAX_LOCAL_PREDICTION = 4;

let statsVisible = false;
let gameState = Config.GAME_STATE.LOBBY;

export async function startGame({ scene, renderer, camera, fx } = {}) {
    const socket = io();
    socket.on('welcome', (data) => {
        console.log(data.message);
    });

    const nicknameForm = document.querySelector('#nickname-form');
    const nicknameInput = document.querySelector('#player-nick-input');
    nicknameForm.addEventListener('submit', (event => {
        event.preventDefault();

        const nickname = nicknameInput.value.trim();
        if (!nickname){
            return;
        }

        socket.emit('setNickname', { nickname});
    }));

    const startBtn = document.getElementById('start-button');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (socket) socket.emit('clientStartRace');
        });
    }

    let localPlayer = null;
    let hud = null;
    const players = new Map();

    socket.on('initPlayer', (data) => {
        localPlayer = new LocalPlayer(data.id, data.nickname);
        console.log(`Initialized player with id: ${localPlayer.getPlayerId()}`);
        players.set(data.id, localPlayer);
        scene.add(localPlayer.mesh);
    });

    socket.on('initObserver', () => {
        console.log('The race has begun. You are an observer. Wait for a new game to begin.');

        if(localPlayer){
            console.warn('Reconnected during the race.');
            scene.remove(localPlayer.mesh);
            players.delete(localPlayer.getPlayerId());
            localPlayer = null;
            hud.hideForObserver();
        }
    });

    socket.on('lobbyUpdate', (data) => {
        if(gameState === Config.GAME_STATE.LOBBY && data.gameState === Config.GAME_STATE.RACE){
            startRace();
            if(!localPlayer){
                hud.hideForObserver();
            }
            gameState = data.gameState;
            return;
        }

        const playersOnline = document.getElementById('players-count-text');
        playersOnline.textContent = `${data.playersCount}`;


        if (localPlayer){
            data.players.forEach(playerFromUpdate => {
                if (localPlayer.getPlayerId() === playerFromUpdate.id &&
                    localPlayer.nickname !== playerFromUpdate.nickname){
                        localPlayer.nickname = playerFromUpdate.nickname;
                        const nicknameText = document.getElementById('lobby-nickname');
                        nicknameText.textContent = `${playerFromUpdate.nickname}`;
                        console.log(`Nickname changed to: ${playerFromUpdate.nickname}`);
                }
            });
        }
        
        const startButton = document.getElementById('start-button');
        const infoText = document.getElementById('info-text');
        if (data.playersCount > 1) {
            startButton.disabled = false;
            infoText.classList.add('hidden');
        }else{
            startButton.disabled = true;
            infoText.classList.remove('hidden');
        }
    });

    socket.on('finishUpdate', () => {
        hud.hideForObserver();
        hud.showFinalRanking();
    });

    const lights = createLights();
    const light = lights.light;
    const dirLight = lights.dirLight;
    scene.add(light, dirLight);

    const localInput = new Input();
    setupTouchControls(localInput);
    window.addEventListener('keydown', e => {if (e.key.toLowerCase() === 'w') localInput.setForward(true);
                                        else if (e.key.toLowerCase() === 's') localInput.setBackward(true);
                                        else if (e.key.toLowerCase() === 'a') localInput.setLeft(true);
                                        else if (e.key.toLowerCase() === 'd') localInput.setRight(true);
                                        else if (e.key.toLowerCase() === 'p') {
                                            statsVisible = !statsVisible;
                                            stats.dom.style.display = statsVisible ? 'block' : 'none';
                                        }
    });
    window.addEventListener('keyup', e => {if (e.key.toLowerCase() === 'w') localInput.setForward(false);
                                        else if (e.key.toLowerCase() === 's') localInput.setBackward(false);
                                        else if (e.key.toLowerCase() === 'a') localInput.setLeft(false);
                                        else if (e.key.toLowerCase() === 'd') localInput.setRight(false);
    });

    let tick = 0;
    let serverTimeOffset = 0;
    let snapshotsBuffer = new SnapshotsBuffer();
    const pendingInputs = [];
    let inputSequence = 0;

    socket.on('snapshot', (snapshot) => {
        tick = snapshot.tick;
        serverTimeOffset = snapshot.serverTime - performance.now();
        snapshotsBuffer.add(snapshot);
        snapshot.players.forEach(playerData => {
            let p = players.get(playerData.id);
            if (p) {
                if (localPlayer && p.id === localPlayer.id && !localPlayer.finish) {
                    localPlayer.isGrounded = playerData.isGrounded;
                    localPlayer.falling = playerData.falling;

                    if(localPlayer.falling && !localPlayer.startFalling){
                        localPlayer.startFalling = true;
                        road.computeFallingRollAndPitch(localPlayer);
                    }

                    if(!localPlayer.falling){
                        localPlayer.updatePosition(playerData.position);
                        localPlayer.velocity = playerData.velocity;
                        localPlayer.velocityY = playerData.velocityY;
                        localPlayer.rotation = playerData.rotation;
                        localPlayer.lap = playerData.lap;
                        localPlayer.progress = playerData.progress;
                        localPlayer.finish = playerData.finish;

                        localPlayer.fallPitch = 0;
                        localPlayer.fallRoll = 0;
                        localPlayer.startFalling = false;
                    }

                    while (pendingInputs.length && pendingInputs[0].seq <= playerData.lastProcessedInput) {
                        pendingInputs.shift();
                    }

                    pendingInputs.forEach(inputPack => {
                        const input = inputPack.input;
                        simulatePlayer(input, 1 / Config.TICK_RATE);
                    });
                }
            } else {
                if(!playerData.finish){
                    const newPlayer = new Player(playerData.id, playerData.nickname);
                    newPlayer.updatePosition(playerData.position);
                    scene.add(newPlayer.mesh);
                    players.set(playerData.id, newPlayer);
                }
            }
        });

        if(tick % 20 === 0){
            if(localPlayer){
                hud.updateRanking(snapshot.players, localPlayer.id);
            }else{
                hud.updateRanking(snapshot.players);
            }
        }
    });

    socket.on('playerFinished', (playerId) => {
        console.log(`Player ${playerId} finished race.`);
        if (players.has(playerId)) {
            scene.remove(players.get(playerId).mesh);
        }
    });

    socket.on('playerDisconnected', (playerId) => {
        if (players.has(playerId)) {
            scene.remove(players.get(playerId).mesh);
            console.log(`Player ${playerId} disconnected.`);
            players.delete(playerId);
        }
    });

    const road = new RoadClient();
    const points = await HELPERS.loadSampledPointsFromRoadCurveClient();
    road.initFromSampledPoints(points);
    //road.drawDebugLine(scene);

    function playerPrediction(dt){
        if (!localPlayer) return;

        while (pendingInputs.length > MAX_LOCAL_PREDICTION) {
            return;
        }

        const inputPack = {
            seq: inputSequence++,
            input: localInput.getInput(),
        };
        pendingInputs.push(inputPack);

        simulatePlayer(inputPack.input, dt);

        socket.emit('playerInput', inputPack);
    }

    function simulatePlayer(input, dt) {
        if(localPlayer.isGrounded){
            localPlayer.isGrounded = road.isGrounded(localPlayer);

            localPlayer.throttle += (input.throttle - localPlayer.throttle) * Config.RESPONSE * dt;
            localPlayer.steer += (input.steer - localPlayer.steer) * Config.RESPONSE * dt;

            let targetSpeed = 0;

            if (localPlayer.throttle > 0) {
                targetSpeed = Config.MAX_SPEED * localPlayer.throttle;
            } else if (localPlayer.throttle < 0) {
                targetSpeed = -Config.MAX_SPEED * -localPlayer.throttle;
            }

            const acceleration = Math.abs(targetSpeed) > Math.abs(localPlayer.velocity) ? Config.ACCELERATION : Config.FRICTION;

            localPlayer.velocity = HELPERS.moveTowards(localPlayer.velocity, targetSpeed, acceleration*dt);

            const speedFactor = Math.min(Math.abs(localPlayer.velocity) / Config.MAX_SPEED, 1);
            const direction = Math.sign(localPlayer.velocity) || 1;
            localPlayer.rotation += localPlayer.steer * Config.TURN_RATE * speedFactor * dt * direction;
        }


        if(localPlayer.falling){
            localPlayer.velocityY -= Config.GRAVITY * dt;
            localPlayer.position.y += localPlayer.velocityY * dt;

            localPlayer.fallPitch += localPlayer.fallPitchVelocity * dt;
            localPlayer.fallRoll += localPlayer.fallRollVelocity * dt;
        }

        localPlayer.position.x += Math.cos(localPlayer.rotation) * localPlayer.velocity * dt;
        localPlayer.position.z += Math.sin(localPlayer.rotation) * localPlayer.velocity * dt;
    }

    const tempOlder = new THREE.Vector3();
    const tempNewer = new THREE.Vector3();
    function interpolate() {
        const renderTime = performance.now() + serverTimeOffset - INTERPOLATION_DELAY;
        const snapshots = snapshotsBuffer.getSnapshots(renderTime);
        if (!snapshots) return;

        const { older, newer } = snapshots;
        const span = newer.serverTime - older.serverTime;
        if (span <= 0) return;

        let t = (renderTime - older.serverTime) / span;
        t = Math.min(Math.max(t, 0), 1);

        const newerMap = new Map(newer.players.map(p => [p.id, p]));

        older.players.forEach(p => {
            if (localPlayer && p.id === localPlayer.getPlayerId()) return;
            if (!players.has(p.id)) return;
            if (p.finish) return;

            const newState = newerMap.get(p.id);
            if (!newState) return;

            const car = players.get(p.id).mesh;
            tempOlder.set(p.position.x, p.position.y, p.position.z);
            tempNewer.set(newState.position.x, newState.position.y, newState.position.z);
            car.position.lerpVectors(tempOlder, tempNewer, t);
            car.rotation.y = -THREE.MathUtils.lerp(p.rotation, newState.rotation, t);
        });
    }

    const stats = new Stats();
    document.body.appendChild(stats.dom);
    stats.dom.style.display = 'none';

    let lastPredictionTime = null;
    const TICK_MS = 1000 / Config.TICK_RATE;

    function animate(time) {
        if (lastPredictionTime === null){
            lastPredictionTime = time;
        }

        if (localPlayer && tick !== 0 && time - lastPredictionTime >= TICK_MS){
            lastPredictionTime = time;
            playerPrediction(1 / Config.TICK_RATE);
        }

        interpolate();
        if (localPlayer && !localPlayer.finish) {
            localPlayer.render();
            fx.updateFromSpeed(localPlayer.velocity, Config.MAX_SPEED);
            camera.update(1/60, localPlayer, localPlayer.isGrounded);
            hud.update(localPlayer);
        }else{
            if (hud.bestRacePlayer && players.has(hud.bestRacePlayer)){
                camera.updateObserver(players.get(hud.bestRacePlayer));
            }else{
                camera.setOnEndPosition();
            }
        }

        if(statsVisible) {
            stats.update();
        }

        fx.render();
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.main.aspect = width / height;
        camera.main.updateProjectionMatrix();
        renderer.setSize(width, height);

        fx.resize(width, height);
    });

    function hideLobby() {
        const lobby = document.getElementById('lobby');
        if(lobby) lobby.style.display = 'none';
    }

    function startRace(){
        hideLobby();
        hud = new HUD();
        requestAnimationFrame(animate);
    }
}