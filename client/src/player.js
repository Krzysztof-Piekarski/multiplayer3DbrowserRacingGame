import * as THREE from 'three';
import { loader } from './loader.js';
import { Set } from '../../shared/settings.js';

export class Player {
    constructor(id, version = 1) {
        this.id = id;
        this.position = new THREE.Vector3(Set.INIT_X_POS, Set.ROAD_Y, Set.INIT_X_POS);
        this.rotation = 0;
        this.velocity = 0;
        this.velocityY = 0;
        this.throttle = 0;
        this.steer = 0;

        this.actualSegment = 0;
        this.isGrounded = true;
        this.startFalling = false;
        this.falling = false;
        this.fallPitchVelocity = 0;
        this.fallRollVelocity = 0;

        this.mesh = this.loadMesh(version);
        this.renderPosition = new THREE.Vector3(0, 0, 0);
        this.renderRotation = 0;
        this.rednerQuaternion = new THREE.Quaternion();
        this.fallPitch = 0;
        this.fallRoll = 0;

        this.lap = 0;
        this.lastProcessedInput = 0;
        this.mesh.position.copy(this.position);

        this.blue = {r: 9, g: 173, b:214};
        this.green = {r: 94, g: 252, b:3};
        this.orange = {r: 210, g: 94, b:7};
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

    updateHUD(roadSegments){
        this.makeHUDvisible();
        this.updateRoadProgress(roadSegments);
        this.updateSpeedBar();
    }

    updateRoadProgress(roadSegments){
        const totalSegments = Set.TOTAL_LAPS * roadSegments;
        const progress = (this.lap * roadSegments + this.actualSegment) / totalSegments;
        const actualLap = Math.min(this.lap+1, Set.TOTAL_LAPS);

        const fill = document.getElementById('road-progress-fill');
        fill.style.width = `${(progress * 100)}%`;
        fill.style.background = this.colorLerp(this.blue, this.green, progress)
        document.getElementById('lap-text').textContent = `LAP: ${actualLap} / ${Set.TOTAL_LAPS}`;
    }

    updateSpeedBar(){
        const speedRatio = (Math.abs(this.velocity) / Set.MAX_SPEED).toFixed(3);
        document.getElementById('speed-bar').style.opacity = `${Math.max(speedRatio, 0.4)}`;

        const fill = document.getElementById('speed-fill');
        fill.style.height = `${speedRatio * 100}%`;
        fill.style.background = this.colorLerp(this.blue, this.orange, speedRatio);
        
    }

    makeHUDvisible(){
        document.getElementById('hud').style.visibility = 'visible';
    }

    lerp(first, second, t){
        return first + (second - first) * t;
    }

    colorLerp(color1, color2, t){
        const r = Math.round(this.lerp(color1.r, color2.r, t));
        const g = Math.round(this.lerp(color1.g, color2.g, t));
        const b = Math.round(this.lerp(color1.b, color2.b, t));

        return `rgb(${r},${g},${b})`
    }
}