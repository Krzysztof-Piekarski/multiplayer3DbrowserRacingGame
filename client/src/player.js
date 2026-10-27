import * as THREE from 'three';
import { loader } from './loader.js';
import { Config } from '../../shared/configuration.js';

export class Player {
    constructor(id, nickname, color = 1) {
        this.id = id;
        this.nickname = nickname;
        this.position = new THREE.Vector3(Config.INIT_X_POS, Config.ROAD_Y, Config.INIT_X_POS);
        this.rotation = 0;

        this.progress = 0;
        this.lap = 0;
        this.finish = false;
        this.lastProcessedInput = 0;

        this.mesh = this.loadMesh(color);
        this.mesh.position.copy(this.position);
    }

    loadMesh(color){
        let patch = './resources/models/cyberpunk_car.glb';
        const loadScale = new THREE.Vector3(0.01, 0.01, 0.01)
        const loadPosition = new THREE.Vector3(0, Config.ROAD_Y ,0)
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
}