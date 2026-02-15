import { createRenderer } from './renderer.js';
import { createScene } from './scene.js';
import { Camera } from './camera.js';
import { createSpecialEffects } from './specialEffects.js';
import * as Loader from './loader.js';
import { startGame } from './game.js';

const renderer = createRenderer();
const scene = createScene();
const camera = new Camera();

await Loader.loadCity(scene);
await Loader.loadRoad(scene);

const fx = createSpecialEffects(renderer, scene, camera.main);

const game = startGame({ renderer, scene, camera, fx });