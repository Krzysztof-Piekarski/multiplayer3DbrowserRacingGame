import * as THREE from 'three';

export class Player {
    constructor(id, color = 0x188ec4) {
        this.id = id;
        this.position = { x: -2, y: -1, z: 0 };
        this.geometry = new THREE.BoxGeometry(1,1,1);
        this.material = new THREE.MeshStandardMaterial({ color: color });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.copy(this.position);
    }

    getPlayerPosition() {
        return this.position;
    }

    getPlayerId() {
        return this.id;
    }

    updatePosition(newPosition) {
        this.position = newPosition;
    }
}