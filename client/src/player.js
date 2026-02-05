import * as THREE from 'three';
import { loader } from './loader.js';
import { Set } from '../../shared/settings.js';

export class Player {
    constructor(id, version = 1) {
        this.id = id;
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = 0;
        this.velocity = 0;
        this.throttle = 0;
        this.steer = 0;

        this.renderPosition = new THREE.Vector3(0, 0, 0);
        this.renderRotation = 0;

        this.actualSegment = 0;

        this.mesh = this.loadMesh(version);

        this.lastProcessedInput = 0;
        this.mesh.position.copy(this.position);
    }

    loadMesh(version){
        let patch = './resources/models/ford.glb';
        const loadScale = new THREE.Vector3(1,1,1);
        const loadPosition = new THREE.Vector3(0, Set.ROAD_Y ,0);
        let loadRotation = -Math.PI/2
        const group = new THREE.Group();

       if(version === 2){
            patch = './resources/models/cyberpunk_car.glb';
            loadScale.set(0.01, 0.01, 0.01)
            loadPosition.set(0, Set.ROAD_Y ,0)
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
        this.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0), -this.renderRotation);
    }
}