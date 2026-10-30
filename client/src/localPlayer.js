import { Player } from './player.js';
import { Config } from '../../shared/configuration.js';
import * as THREE from 'three';

export class LocalPlayer extends Player {
    constructor(id, nickname) {
        super(id, nickname);

        this.velocity = 0;
        this.velocityY = 0;
        this.throttle = 0;
        this.steer = 0;

        this.actualSegment = Config.INIT_SEGMENT;

        this.renderPosition = new THREE.Vector3(0, 0, 0);
        this.renderRotation = 0;
        this.rednerQuaternion = new THREE.Quaternion();
        this.fallPitch = 0;
        this.fallRoll = 0;

        this.isGrounded = true;
        this.startFalling = false;
        this.falling = false;
        this.fallPitchVelocity = 0;
        this.fallRollVelocity = 0;
    }

    render(delta = 0.2){
        this.renderPosition.lerp(this.position, delta);
        this.mesh.position.copy(this.renderPosition);
        this.renderRotation += (this.rotation - this.renderRotation) * delta;

        const pitch = this.falling ? this.fallPitch : 0;
        const roll = this.falling ? this.fallRoll : 0;

        const quaternionYaw = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0,1,0),
            -this.renderRotation
        )
        const quaternionPitch = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0,0,1),
            pitch
        )
        const quaternionRoll = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1,0,0),
            roll
        )

        const targetQuaternion = quaternionYaw.clone()
            .multiply(quaternionPitch)
            .multiply(quaternionRoll);

        this.rednerQuaternion.slerp(targetQuaternion, delta * 3);
        this.mesh.quaternion.copy(this.rednerQuaternion);
    }
}