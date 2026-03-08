import { io } from 'socket.io-client';
import { Config } from '../../shared/configuration.js';
import { createLights } from './lights.js';
import { Input } from './input.js';
import { setupTouchControls } from './touchControls.js';
import { Player } from './player.js';
import { HUD } from './hud.js';
import { RoadClient } from './roadClient.js';
import * as HELPERS from '../../shared/helpers.js';
import { SnapshotsBuffer } from './snapshotsBuffer.js';
import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';

const INTERPOLATION_DELAY = 100;
const MAX_LOCAL_PREDICTION = 4;

let statsVisible = false;

export async function startGame({ scene, renderer, camera, fx } = {}) {
    const socket = io(`${window.location.protocol}//${window.location.hostname}:3000`);
    socket.on('welcome', (data) => {
        console.log(data.message);
    });

    let player = null;
    let hud = null;
    const players = new Map();

    socket.on('initPlayer', (data) => {
        player = new Player(data.id);
        hud = new HUD();
        console.log(`Initialized player with id: ${player.getPlayerId()}`);
        players.set(data.id, player);
        scene.add(player.mesh);
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
                if (p.id === player.id) {
                    player.isGrounded = playerData.isGrounded;
                    player.falling = playerData.falling;

                    if(player.falling && !player.startFalling){
                        player.startFalling = true;
                        road.computeFallingRollAndPitch(player);
                    }

                    if(!player.falling){
                        player.updatePosition(playerData.position);
                        player.velocity = playerData.velocity;
                        player.velocityY = playerData.velocityY;
                        player.rotation = playerData.rotation;
                        player.lap = playerData.lap;
                        player.progress = playerData.progress;
                        player.finish = playerData.finish;

                        player.fallPitch = 0;
                        player.fallRoll = 0;
                        player.startFalling = false;
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
                const newPlayer = new Player(playerData.id);
                newPlayer.updatePosition(playerData.position);
                scene.add(newPlayer.mesh);
                players.set(playerData.id, newPlayer);
            }
        });

        if(tick % 20 === 0){
            hud.updateRanking(snapshot.players, player.id);
        }
    });

    socket.on('playerDisconnected', (playerId) => {
        console.log(`Player ${playerId} disconnected.`);
        if (players.has(playerId)) {
            scene.remove(players.get(playerId).mesh);
            players.delete(playerId);
        }
    });

    const road = new RoadClient();
    const points = await HELPERS.loadSampledPointsFromRoadCurveClient();
    road.initFromSampledPoints(points);
    //road.drawDebugLine(scene);

    function playerPrediction(dt){
        if (!player) return;

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
        if(player.isGrounded){
            player.isGrounded = road.isGrounded(player);

            player.throttle += (input.throttle - player.throttle) * Config.RESPONSE * dt;
            player.steer += (input.steer - player.steer) * Config.RESPONSE * dt;

            let targetSpeed = 0;

            if (player.throttle > 0) {
                targetSpeed = Config.MAX_SPEED * player.throttle;
            } else if (player.throttle < 0) {
                targetSpeed = -Config.MAX_SPEED * -player.throttle;
            }

            const acceleration = Math.abs(targetSpeed) > Math.abs(player.velocity) ? Config.ACCELERATION : Config.FRICTION;

            player.velocity = HELPERS.moveTowards(player.velocity, targetSpeed, acceleration*dt);

            const speedFactor = Math.min(Math.abs(player.velocity) / Config.MAX_SPEED, 1);
            const direction = Math.sign(player.velocity) || 1;
            player.rotation += player.steer * Config.TURN_RATE * speedFactor * dt * direction;
        }


        if(player.falling){
            player.velocityY -= Config.GRAVITY * dt;
            player.position.y += player.velocityY * dt;

            player.fallPitch += player.fallPitchVelocity * dt;
            player.fallRoll += player.fallRollVelocity * dt;
        }

        player.position.x += Math.cos(player.rotation) * player.velocity * dt;
        player.position.z += Math.sin(player.rotation) * player.velocity * dt;
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
            if (p.id === player.getPlayerId()) return;
            if (!players.has(p.id)) return;

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

    let lastPredictionTime = 0;
    const TICK_MS = 1000 / Config.TICK_RATE;

    function animate(time) {
        if(player && tick !== 0 && time - lastPredictionTime >= TICK_MS){
            playerPrediction(1 / Config.TICK_RATE);
            lastPredictionTime += TICK_MS;
        }

        interpolate();
        if(player) {
            player.render();
            fx.updateFromSpeed(player.velocity, Config.MAX_SPEED);
            camera.update(1/60, player, player.isGrounded);
            hud.update(player);
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

    animate();
}