const SNAPSHOTS_BUFFER_SIZE = 5;

export class SnapshotsBuffer {
    constructor(){
        this.snapshots = [];
    }

    add(snapshot) {
        this.snapshots.push(snapshot);

        if (this.snapshots.length > SNAPSHOTS_BUFFER_SIZE) {
            this.snapshots.shift();
        }
    }

    getSnapshots(renderTime) {
        if (this.snapshots.length < 2) return null;

        for (let i = 0; i < this.snapshots.length - 1; i++) {
            const older = this.snapshots[i];
            const newer = this.snapshots[i + 1];
            if (older.serverTime <= renderTime && renderTime <= newer.serverTime) {
                return { older, newer };
            }
        }
        return null;
    }

    getLatestServerTime(){
        if (this.snapshots.length === 0) return 0;
        return this.snapshots[this.snapshots.length - 1].serverTime;
    }
}      