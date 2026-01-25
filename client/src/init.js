import { createRenderer } from './renderer.js';
import { createScene } from './scene.js';
import { loadModels } from './loader.js';
import { startGame } from './game.js';

const renderer = createRenderer();
const scene = createScene();
await loadModels(scene);

const game = startGame({ renderer, scene });