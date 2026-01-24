import { io } from 'socket.io-client';
import * as THREE from 'three';
import { createCamera } from './camera.js';
import { createLights } from './lights.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { SnapshotsBuffer } from './snapshotsBuffer.js';

const TICK_RATE = 20;
const INTERPOLATION_DELAY = 100;
const SPEED = 4;

export function startGame({ scene, renderer } = {}) {
    const socket = io('http://localhost:3000');
    socket.on('welcome', (data) => {
        console.log(data.message);
    });

    let player = null;
    const players = new Map();

    socket.on('initPlayer', (data) => {
        player = new Player(data.id, 0xb8b806);
        console.log(`Initialized player with id: ${player.getPlayerId()}`);
        players.set(data.id, player);
        scene.add(player.mesh);
    });

    const camera = createCamera();
    const lights = createLights();
    const light = lights.light;
    const dirLight = lights.dirLight;
    scene.add(light, dirLight);

    const input = new Input();
    window.addEventListener('keydown', e => {if (e.key.toLowerCase() === 'w') input.setForward(true);
                                        else if (e.key.toLowerCase() === 's') input.setBackward(true);
                                        else if (e.key.toLowerCase() === 'a') input.setLeft(true);
                                        else if (e.key.toLowerCase() === 'd') input.setRight(true);
    });
    window.addEventListener('keyup', e => {if (e.key.toLowerCase() === 'w') input.setForward(false);
                                        else if (e.key.toLowerCase() === 's') input.setBackward(false);
                                        else if (e.key.toLowerCase() === 'a') input.setLeft(false);
                                        else if (e.key.toLowerCase() === 'd') input.setRight(false);
    });


    let snapshotsBuffer = new SnapshotsBuffer();

    socket.on('snapshot', (snapshot) => {
        snapshotsBuffer.add(snapshot);
        snapshot.players.forEach(playerData => {
            let p = players.get(playerData.id);
            if (p) {
                if (p.id === player.id) {
                    const serverPos = playerData.position;

                    const dx = serverPos.x - player.position.x;
                    const dz = serverPos.z - player.position.z;
                    const distSq = dx * dx + dz * dz;
                    if (distSq > 0.0001){
                        player.updatePosition(serverPos);
                    }

                    while (pendingInputs.length && pendingInputs[0].seq <= playerData.lastProcessedInput) {
                        pendingInputs.shift();
                    }

                    pendingInputs.forEach(inputPack => {
                        const input = inputPack.input;
                        simulatePlayer(input);
                    });
                }
            } else {
                const newPlayer = new Player(playerData.id);
                newPlayer.updatePosition(playerData.position);
                scene.add(newPlayer.mesh);
                players.set(playerData.id, newPlayer);
            }
        });
    });

    socket.on('playerDisconnected', (playerId) => {
        console.log(`Player ${playerId} disconnected.`);
        if (players.has(playerId)) {
            scene.remove(players.get(playerId).mesh);
            players.delete(playerId);
        }
    });

    const pendingInputs = [];
    let inputSequence = 0;

    function playerPrediction(){
        if (!player) return;
        if (!input.hasInput()) return;

        const inputPack = {
            seq: inputSequence++,
            input: input.getInput(),
        };
        pendingInputs.push(inputPack);

        simulatePlayer(input.getInput());

        socket.emit('playerInput', inputPack);
    }

    function simulatePlayer(input) {
        if (input.forward) player.position.x -= SPEED;
        if (input.backward) player.position.x += SPEED;
        if (input.left) player.position.z += SPEED;
        if (input.right) player.position.z -= SPEED;
    }

    function interpolate() {
        const renderTime = Date.now() - INTERPOLATION_DELAY;
        const snapshots = snapshotsBuffer.getSnapshots(renderTime);
        if (!snapshots) return;

        const { older, newer } = snapshots;
        const span = newer.serverTime - older.serverTime;
        if (span <= 0) return;

        let t = (renderTime - older.serverTime) / span;
        t = Math.min(Math.max(t, 0), 1);
        older.players.forEach(p => {
            if (p.id === player.getPlayerId()) return;
            if (!players.has(p.id)) return;

            const newState = newer.players.find(op => op.id === p.id);
            if (!newState) return;
            players.get(p.id).mesh.position.lerpVectors(p.position, newState.position, t);
        });
    }

    let lastPredictionTime = 0;
    const TICK_MS = 1000 / TICK_RATE;

    function animate(time) {
        if(player && time - lastPredictionTime >= TICK_MS){
            playerPrediction();
            lastPredictionTime += TICK_MS;
        }

        if(player){
            player.render();
            camera.position.set(player.mesh.position.x + 7, player.mesh.position.y + 1, player.mesh.position.z);
            camera.lookAt(player.mesh.position.x, player.mesh.position.y, player.mesh.position.z);
        }

        interpolate();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}