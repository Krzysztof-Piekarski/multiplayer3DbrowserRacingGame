import * as THREE from 'three';
import { loader } from './loader.js';
import { Set } from '../../shared/settings.js';

export class Player {
    constructor(id, color = 1) {
        this.id = id;
        this.position = new THREE.Vector3(Set.INIT_X_POS, Set.ROAD_Y, Set.INIT_X_POS);
        this.rotation = 0;
        this.velocity = 0;
        this.velocityY = 0;
        this.throttle = 0;
        this.steer = 0;

        this.actualSegment = 0;
        this.progress = 0;
        this.lap = 0;
        this.finish = false;
        this.lastProcessedInput = 0;

        this.mesh = this.loadMesh(color);
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

        this.mesh.position.copy(this.position);
    }

    loadMesh(color){
        let patch = './resources/models/cyberpunk_car.glb';
        const loadScale = new THREE.Vector3(0.01, 0.01, 0.01)
        const loadPosition = new THREE.Vector3(0, Set.ROAD_Y ,0)
        let loadRotation = -Math.PI/2
        const group = new THREE.Group();

       if(color === 2){
            //TO DO
       }

        loader.load(
            `${patch}`,
            function(gltf){
                gltf.scene.scale.copy(loadScale);
                gltf.scene.position.copy(loadPosition);
                gltf.scene.rotateY(loadRotation);
                const model = gltf.scene;
                model.traverse(function(node){
                    if(node.isMesh){
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                group.add(model);
            },
            undefined,
            function(error){
                console.error('Player\'s car failed to load', error);
            }
        );

        return group;
    }

    getPlayerId() {
        return this.id;
    }

    updatePosition(newPosition) {
        this.position.set(newPosition.x, newPosition.y, newPosition.z);
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