import { io } from 'socket.io-client';
import * as THREE from 'three';
import { createCamera } from './camera.js';
import { createLights } from './lights.js';
import { Player } from './player.js';
import { SnapshotsBuffer } from './snapshotsBuffer.js';

const TICK_RATE = 20;
const INTERPOLATION_DELAY = 100;
const SPEED = 5;

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

    const keys = {};
    window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

    function getInput() {
        const forward = keys['w'] || false;
        const backward = keys['s'] || false;
        const left = keys['a'] || false;
        const right = keys['d'] || false;
        return { forward, backward, left, right };
    }

    setInterval(() => {
        if (player) {
            const input = getInput();
            socket.emit('playerInput', input);
        }
    }, 1000 / TICK_RATE);

    let snapshotsBuffer = new SnapshotsBuffer();

    socket.on('snapshot', (snapshot) => {
        snapshotsBuffer.add(snapshot);
        snapshot.players.forEach(playerData => {
            let p = players.get(playerData.id);
            if (p) {
                p.updatePosition(playerData.position);
            } else {
                const newPlayer = new Player(playerData.id);
                newPlayer.updatePosition(playerData.position);
                scene.add(newPlayer.mesh);
                players.set(playerData.id, newPlayer);
            }
        });

        camera.position.set(player.position.x + 7, player.position.y + 1, player.position.z);
        camera.lookAt(player.position.x, player.position.y, player.position.z);
    });

    socket.on('playerDisconnected', (playerId) => {
        console.log(`Player ${playerId} disconnected.`);
        if (players.has(playerId)) {
            scene.remove(players.get(playerId).mesh);
            players.delete(playerId);
        }
    });

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

    function animate() {
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