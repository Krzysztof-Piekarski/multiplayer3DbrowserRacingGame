import * as THREE from 'three';
import { Config } from '../../shared/configuration.js';

export function createRenderer() {
    const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
    const container = document.getElementById('game-container');
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.physicallyCorrectLights = false;
    renderer.setPixelRatio(window.devicePixelRatio/Config.RESOLUTION_DOWNGRADE);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    return renderer;
}