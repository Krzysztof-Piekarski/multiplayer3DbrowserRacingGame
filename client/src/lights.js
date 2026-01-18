import * as THREE from 'three';

export function createLights() {
    const light = new THREE.AmbientLight(0xffffff, 0.5);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight.castShadow = true;
    dirLight.position.set(0, 70, 70);
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.bias = -0.001;

    return { light, dirLight };
}