import * as THREE from 'three';

export class Player {
    constructor(id, color = 0x188ec4) {
        this.id = id;
        this.position = { x: 0, y: 0, z: 0 };
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
        this.position = newPosition;
    }
}