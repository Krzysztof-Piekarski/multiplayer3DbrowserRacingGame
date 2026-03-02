import fs from 'fs/promises';

export function moveTowards(current, target, maxDelta) {
    if (Math.abs(target - current) <= maxDelta) return target;
    return current + Math.sign(target - current) * maxDelta;
}

export async function loadSampledPointsFromRoadCurveClient(){
    const file = await fetch('./resources/models/sampledRoadCurve.json');
    const data = await file.json();

    return setUpSampledPointsFromData(data);
}

export async function loadSampledPointsFromRoadCurveServer(){
    const data = JSON.parse(
        await fs.readFile('./client/resources/models/sampledRoadCurve.json', 'utf8')
    )

    return setUpSampledPointsFromData(data);
}

function setUpSampledPointsFromData(data){
        return data.points.map(p => ({
        x: p[0],
        z: p[1]
    }));
}