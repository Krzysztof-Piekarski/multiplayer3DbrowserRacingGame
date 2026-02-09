import { Set } from './settings.js';

export class Road{
    constructor(){
        this.roadWidth = Set.ROAD_WIDTH;
        this.halfWidthsquare = (this.roadWidth * 0.5) ** 2;

        this.sampledPoints = null;
        this.segments = []; // {firstX, firstZ, secondX, secondZ, deltaX, deltaZ}
        this.length = 0;
    }

    initFromSampledPoints(points){
        this.segments.length = 0;
        this.sampledPoints = points;

        for(let i = 0; i < points.length; i++){
            const first = points[i];
            const second = points[(i + 1) % points.length];

            this.segments.push({
                firstX: first.x, firstZ: first.z,
                secondX: second.x, secondZ: second.z,
                deltaX: second.x - first.x,
                deltaZ: second.z - first.z,
                lenSqrt: (second.x - first.x) ** 2 + (second.z - first.z) ** 2  
            });
        }

        this.length = this.segments.length - 1;
    }

    isGrounded(player){
        if(player.falling){
            return false;
        }

        let bestSegment = player.actualSegment;
        let bestDistSq = Infinity;

        for(let i = -1; i <= 1; i++){
            const index = (player.actualSegment + i + this.length) % this.length;
            const seg = this.segments[index];

            if (seg.lenSqrt === 0) continue;
            
            const apx = player.position.x - seg.firstX;
            const apz = player.position.z - seg.firstZ;

            let t = (apx * seg.deltaX + apz * seg.deltaZ) / seg.lenSqrt;
            t = t < 0 ? 0 : (t > 1 ? 1 : t);

            const cx = seg.firstX + seg.deltaX * t;
            const cz = seg.firstZ + seg.deltaZ * t;

            const dx = player.position.x - cx;
            const dz = player.position.z - cz;

            const dSq = dx * dx + dz * dz;

            if(dSq < bestDistSq){
                bestDistSq = dSq;
                bestSegment = index;
            }
        }

        const isGrounded = bestDistSq <= this.halfWidthsquare;
        player.actualSegment = bestSegment;
        if(!isGrounded){
            player.falling = true;
        }

        return isGrounded;
    }

    getSegmentCenterPos(index){
        const seg = this.segments[index];
        return{
            x: seg.firstX + seg.deltaX * 0.5,
            z: seg.firstZ + seg.deltaZ * 0.5
        };
    }

    getSegmentRotation(index){
        const seg = this.segments[index];
        return Math.atan2(seg.deltaZ, seg.deltaX);
    }

    getLength(){
        return this.length;
    }
}