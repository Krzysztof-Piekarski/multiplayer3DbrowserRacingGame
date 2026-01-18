import * as THREE from 'three';

export function createScene() {
    const scene = new THREE.Scene();

    const cubeLoader = new THREE.CubeTextureLoader();
    const texture = cubeLoader.load([
        './resources/px.png',
        './resources/nx.png',
        './resources/py.png',
        './resources/ny.png',
        './resources/pz.png',
        './resources/nz.png',
    ]);
    scene.background = texture;

    return scene;
}