import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
export const loader = new GLTFLoader();

export async function loadModels(scene) {
    return new Promise((resolve) => {
        loader.load(
            "./resources/models/city.glb",
            function(gltf){
                gltf.scene.scale.set(0.01,0.01,0.01);
                gltf.scene.position.set(0,-2.2,0);
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
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function(error){
                console.error(error);
                resolve();
            }
        );
    });
}