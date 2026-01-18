import { io } from 'socket.io-client';
import { createRenderer } from './renderer.js';
import { createScene } from './scene.js';
import { startGame } from './game.js';

const socket = io('http://localhost:3000');

socket.on('welcome', (data) => {
    console.log(data.message);
});

const renderer = createRenderer();
const scene = createScene();

const game = startGame({ renderer, scene });