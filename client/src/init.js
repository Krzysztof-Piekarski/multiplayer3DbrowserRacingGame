import { createRenderer } from './renderer.js';
import { createScene } from './scene.js';
import { startGame } from './game.js';

const renderer = createRenderer();
const scene = createScene();

const game = startGame({ renderer, scene });