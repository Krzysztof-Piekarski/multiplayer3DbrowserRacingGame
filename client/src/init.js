import { createRenderer } from './renderer.js';
import { createScene } from './scene.js';
import * as Loader from './loader.js';
import { startGame } from './game.js';

const renderer = createRenderer();
const scene = createScene();
await Loader.loadCity(scene);
await Loader.loadRoad(scene);

const game = startGame({ renderer, scene });