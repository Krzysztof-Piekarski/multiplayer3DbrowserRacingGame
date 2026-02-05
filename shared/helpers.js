export function moveTowards(current, target, maxDelta) {
    if (Math.abs(target - current) <= maxDelta) return target;
    return current + Math.sign(target - current) * maxDelta;
}

export async function loadSampledPointsFromRoadCurve(path){
    const file = await fetch(path);
    const data = await file.json();

    return data.points.map(p => ({
        x: p[0],
        z: p[1]
    }));
}