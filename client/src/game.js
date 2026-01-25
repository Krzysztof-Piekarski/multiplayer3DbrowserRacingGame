import { io } from 'socket.io-client';
import { createCamera } from './camera.js';
import { createLights } from './lights.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { SnapshotsBuffer } from './snapshotsBuffer.js';
import * as THREE from 'three';
import { update } from 'three/examples/jsm/libs/tween.module.js';

const TICK_RATE = 20;
const INTERPOLATION_DELAY = 100;

const MAX_SPEED = 20;
const ACCELERATION = 10;
const FRICTION = 5;
const TURN_RATE = 2.5;
const RESPONSE = 10;

const CAMERA_DISTANCE = 6;
const CAMERA_HEIGHT = 4;
const CAMERA_LERP = 0.16;

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
                    player.updatePosition(playerData.position);
                    player.velocity = playerData.velocity;
                    player.rotation = playerData.rotation;

                    while (pendingInputs.length && pendingInputs[0].seq <= playerData.lastProcessedInput) {
                        pendingInputs.shift();
                    }

                    pendingInputs.forEach(inputPack => {
                        const input = inputPack.input;
                        simulatePlayer(input, 1 / TICK_RATE);
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

    function playerPrediction(dt){
        if (!player) return;

        const inputPack = {
            seq: inputSequence++,
            input: input.getInput(),
        };
        pendingInputs.push(inputPack);

        simulatePlayer(inputPack.input, dt);

        socket.emit('playerInput', inputPack);
    }

    function simulatePlayer(input, dt) {
        player.throttle += (input.throttle - player.throttle) * RESPONSE * dt;
        player.steer += (input.steer - player.steer) * RESPONSE * dt;
        if (player.throttle != 0) {
            player.velocity += player.throttle * ACCELERATION * dt;
        } else {
            const sign = Math.sign(player.velocity);
            player.velocity -= sign * FRICTION * dt;
            if (Math.sign(player.velocity) != sign) {
                player.velocity = 0;
            }
        }

        player.velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, player.velocity));

        const speedFactor = Math.min(Math.abs(player.velocity) / MAX_SPEED, 1);
        player.rotation += player.steer * TURN_RATE * speedFactor * dt;

        player.position.x += Math.cos(player.rotation) * player.velocity * dt;
        player.position.z += Math.sin(player.rotation) * player.velocity * dt;
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
            players.get(p.id).mesh.quaternion.slerpQuaternions(
                new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), -p.rotation),
                new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), -newState.rotation),
                t
            );
        });
    }

    function updateCamera(){
        const forward = new THREE.Vector3(
        Math.cos(player.renderRotation), 0, Math.sin(player.renderRotation));

        const desiredCameraPos = player.mesh.position.clone()
        .addScaledVector(forward, CAMERA_DISTANCE)
        .add(new THREE.Vector3(0, CAMERA_HEIGHT, 0));

        camera.position.lerp(desiredCameraPos, CAMERA_LERP);
        camera.lookAt(player.mesh.position);
    }

    let lastPredictionTime = 0;
    const TICK_MS = 1000 / TICK_RATE;

    function animate(time) {
        if(player && time - lastPredictionTime >= TICK_MS){
            playerPrediction(1 / TICK_RATE);
            lastPredictionTime += TICK_MS;
        }

        if(player){
            player.render();
            updateCamera();
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