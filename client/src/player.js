import * as THREE from 'three';

export class Player {
    constructor(id, color = 0x188ec4) {
        this.id = id;
        this.position = new THREE.Vector3(0, 0, 0);
        this.renderPosition = new THREE.Vector3(0, 0, 0);
        this.geometry = new THREE.BoxGeometry(1,1,1);
        this.material = new THREE.MeshStandardMaterial({ color: color });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.lastProcessedInput = 0;
        this.mesh.position.copy(this.position);
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
    }
}