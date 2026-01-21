import * as THREE from 'three';

export class Player {
    constructor(id){
        this.id = id;
        this.position = { x: -2, y: -1, z: 0 };
        this.geometry = new THREE.BoxGeometry(1,1,1);
        this.material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
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
        this.mesh.position.copy(this.position);
    }
}