import { io } from 'socket.io-client';
import * as THREE from 'three';
import { createCamera } from './camera.js';
import { createLights } from './lights.js';
import { Player } from './player.js';

const TICK_RATE = 20;

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

    socket.on('playersUpdate', (data) => {
        data.forEach(playerData => {
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
    });

    socket.on('playerDisconnected', (playerId) => {
        console.log(`Player ${playerId} disconnected.`);
        if (players.has(playerId)) {
            scene.remove(players.get(playerId).mesh);
            players.delete(playerId);
        }
    });

    function animate() {

        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}