import * as THREE from 'three';
import { Road } from '../../shared/road.js';

export class RoadClient extends Road{
    computeFallingRollAndPitch(player){
        const seg = this.segments[player.actualSegment];
        const center = this.getSegmentCenterPos(player.actualSegment);

        const offX = player.position.x - center.x;
        const offZ = player.position.z - center.z;

        const crossProduct = seg.deltaX * offZ - seg.deltaZ * offX;;

        player.fallPitchVel = 0;
        player.fallRollVel = 0;

        player.fallPitchVelocity = player.velocity > 0 ? -1.8 : 1.8;
        player.fallRollVelocity = crossProduct > 0 ? 1.8 : -1.8;
    }

    drawDebugLine(scene){
        const points = this.sampledPoints.map(
            p => new THREE.Vector3(p.x, 0, p.z)
        );
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xcc7777
        });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
    }

    //If sampleAmount has been changed, this method must be called
    //and the sampledRoadCurve.json file in the ../../common folder must be replaced.
    async generateSampledPointsFromRoadCurve(){
        const patch = await fetch('./resources/models/roadCurve.json');
        const data = await patch.json();
        const sampleAmount = 360;

        const rawPoints = data.points.map(
            p => new THREE.Vector3(p[0], 0, -p[1])
        );

        const curve = new THREE.CatmullRomCurve3(
            rawPoints,
            data.closed,
            'catmullrom',
            0.0
        );

        const sampledCurve = curve.getPoints(sampleAmount);

        const output = {
            closed: data.closed,
            sampleAmount,
            points: sampledCurve.map(p => [p.x, p.z])
        };

        const blob = new Blob([JSON.stringify(output, null, 2)], {
            type: 'aplication/json'
        });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'sampledRoadCurve.json';
        a.click();
    }
}