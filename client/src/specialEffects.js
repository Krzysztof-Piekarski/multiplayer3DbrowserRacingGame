import * as THREE from 'three';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function createSpecialEffects(renderer, scene, camera){
    const renderScene = new RenderPass(scene, camera);
    const effectsComposer = new EffectComposer(renderer);
    effectsComposer.addPass(renderScene);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.2, //strength
        0.3, //radius
        0.0 //threshold
    );
    effectsComposer.addPass(bloomPass);

    function updateFromSpeed(speed, maxSpeed){
        const t = Math.min(Math.abs(speed) / maxSpeed, 1);

        //bloomPass.radius = Math.max(0.05, t);
    }

    function render(){
        effectsComposer.render();
    }

    function resize(w, h){
        effectsComposer.setSize(w, h);
    }

    return {
        render,
        updateFromSpeed,
        resize
    };
}