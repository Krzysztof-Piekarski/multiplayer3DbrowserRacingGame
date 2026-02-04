import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
export const loader = new GLTFLoader();

export async function loadCity(scene) {
    return new Promise((resolve) => {
        loader.load(
            "./resources/models/city.glb",
            function(gltf){
                gltf.scene.scale.set(1,1,1);
                gltf.scene.position.set(0,-0.2,0);
                const city = gltf.scene;
                city.traverse(function(node){
                    if(node.isMesh){
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                scene.add(city);
                resolve(gltf);
            },
            function(xhr){
                console.log((xhr.loaded / xhr.total * 100) + '% of city model loaded');
            },
            function(error){
                console.error('Race route failed to load', error);
                resolve();
            }
        );
    });
}

export async function loadRoad(scene){
    return new Promise((resolve) => {
        loader.load(
            "./resources/models/road.glb",
            function(gltf){
                gltf.scene.scale.set(1,1,1);
                gltf.scene.position.set(0,-0.2,0);
                const road = gltf.scene;
                road.traverse(function(node){
                    if(node.isMesh){
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                scene.add(road);
                resolve(gltf);
            },
            function(xhr){
                console.log((xhr.loaded / xhr.total * 100) + '% of road model loaded');
            },
            function(error){
                console.error('Race route failed to load', error);
                resolve();
            }
        );
    });
}

export async function loadRoadCurve(scene){
        const patch = await fetch('./resources/models/roadCurve.json');
        const data = await patch.json();
        const drawGreenDebugLineInRoad = true;

        const rawPoints = data.points.map(
            p => new THREE.Vector3(p[0], 0, -p[1])
        );

        const curve = new THREE.CatmullRomCurve3(
            rawPoints,
            data.closed,
            'catmullrom',
            0.0
        );

        if(drawGreenDebugLineInRoad){
            const sampledCurve = curve.getPoints(400);

            const geometry = new THREE.BufferGeometry().setFromPoints(sampledCurve);
            const material = new THREE.LineBasicMaterial({
                color: 0x00ff22
            });
            const line = new THREE.Line(geometry, material);
            scene.add(line);
        }

        return curve;
    }