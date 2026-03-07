import * as THREE from 'three';
import { Config } from '../../shared/configuration.js';

export class Camera {
    constructor(){
        this.cameraTarget = new THREE.Vector3();
        this.cameraPosition = new THREE.Vector3(Config.INIT_X_POS, 0, Config.INIT_Z_POS);
        this.main = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.main.position.copy(this.cameraPosition);
        this.cameraRoll = 0;
    }

    update(dt = 1/60, player, isGrounded){
        const forward = new THREE.Vector3(
        Math.cos(player.renderRotation), 0, Math.sin(player.renderRotation));
        const speedFactor = Math.min(Math.abs(player.velocity) / Config.MAX_SPEED, 1);

        const desiredCameraPos = player.renderPosition.clone()
        .addScaledVector(forward, (-Camera.DISTANCE * speedFactor - Camera.DISTANCE/2));
        desiredCameraPos.y += Camera.HEIGHT + speedFactor * 0.8;

        const velocityDirection = new THREE.Vector3(Math.cos(player.rotation),
                            0, Math.sin(player.rotation));
        const driftAmount = 1 - forward.dot(velocityDirection);
        const lag = Camera.LAG_BASE - driftAmount * Camera.LAG_DRIFT;

        this.cameraPosition.lerp(desiredCameraPos, 1 - Math.exp(-dt * lag));
        this.cameraTarget.lerp(player.renderPosition.clone().addScaledVector(forward, 2),
                            1 - Math.exp(-dt * 10));

        let targetRoll = 0;
        if(isGrounded){
            targetRoll = -player.steer * Camera.ROLL_MAX * speedFactor;
        }                    
        this.cameraRoll += (targetRoll - this.cameraRoll) * Camera.ROLL_RESPONSE * dt;
                
        if(isGrounded){
            this.main.position.copy(this.cameraPosition);
        }
        this.main.lookAt(this.cameraTarget);
        this.main.up.set(0, 1, 0);
        this.main.rotateZ(this.cameraRoll);
    }

    static DISTANCE = 6;
    static HEIGHT = 2;
    static LAG_BASE = 20;
    static LAG_DRIFT = 4;
    static ROLL_MAX = THREE.MathUtils.degToRad(24);
    static ROLL_RESPONSE = 4;
}