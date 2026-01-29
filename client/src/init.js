import { createRenderer } from './renderer.js';
import { createScene } from './scene.js';
import { loadRoute } from './loader.js';
import { startGame } from './game.js';

const renderer = createRenderer();
const scene = createScene();
await loadRoute(scene);

const game = startGame({ renderer, scene });