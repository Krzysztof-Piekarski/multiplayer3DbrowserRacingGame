import { Config } from '../../shared/configuration.js';

export class HUD {
    constructor(){
        document.getElementById('hud').style.visibility = 'visible';
        document.getElementById('touch-controls').style.visibility = 'visible';

        this.roadProgressFill = document.getElementById('road-progress-fill');
        this.ranking = document.getElementById('ranking');
        this.lapTxt = document.getElementById('lap-text');
        this.speedBar = document.getElementById('speed-bar');
        this.speedFill = document.getElementById('speed-fill');

        this.lastRankingOrder = [];

        this.blue = {r: 9, g: 173, b:214};
        this.green = {r: 94, g: 252, b:3};
        this.orange = {r: 210, g: 94, b:7};
    }

    update(player){
        this.updateRoadProgress(player);
        this.updateSpeedBar(player);
    }

    updateRoadProgress(player){
        const actualLap = Math.min(player.lap+1, Config.TOTAL_LAPS);
        this.roadProgressFill.style.width = `${(player.progress * 100)}%`;
        this.roadProgressFill.style.background = this.colorLerp(this.blue, this.green, player.progress)
        this.lapTxt.textContent = `LAP: ${actualLap} / ${Config.TOTAL_LAPS}`;
    }

    updateSpeedBar(player){
        const speedRatio = (Math.abs(player.velocity) / Config.MAX_SPEED).toFixed(3);
        this.speedBar.style.opacity = `${Math.max(speedRatio, 0.4)}`;
        
        this.speedFill.style.height = `${speedRatio * 100}%`;
        this.speedFill.style.background = this.colorLerp(this.blue, this.orange, speedRatio);
    }

    updateRanking(players, localPlayerId){
        const sorted = [...players].sort((a, b) => b.progress - a.progress);
        const newOrder = sorted.map(p => p.id);

        this.ranking.querySelectorAll('.rank-item').forEach(el => {
            if (!newOrder.includes(el.dataset.id)) {
                el.remove();
            }
        });

        const oldPositions = new Map();
        this.ranking.querySelectorAll('.rank-item').forEach(el => {
            oldPositions.set(el.dataset.id, el.getBoundingClientRect());
        });

        sorted.forEach((player, index) => {
            let el = this.ranking.querySelector(`[data-id="${player.id}"]`);

            if (!el) {
                el = document.createElement('div');
                el.className = 'rank-item';
                el.dataset.id = player.id;
                this.ranking.appendChild(el);
            }

            el.textContent = `${index + 1}. ${player.id} ${(player.progress*100).toFixed(2)}%`;
            if(localPlayerId && player.id === localPlayerId){
                el.style.fontWeight = 'bold';
            }
        });

        newOrder.forEach(id => {
            const el = this.ranking.querySelector(`[data-id="${id}"]`);
            this.ranking.appendChild(el);
        })

        const newPositions = new Map();
        this.ranking.querySelectorAll('.rank-item').forEach(el => {
            newPositions.set(el.dataset.id, el.getBoundingClientRect());
        });

        this.ranking.querySelectorAll('.rank-item').forEach(el => {

            const id = el.dataset.id;
            const oldPos = oldPositions.get(id);
            const newPos = newPositions.get(id);

            if(!oldPos || !newPos) return;

            const deltaY = oldPos.top - newPos.top;

            if (Math.abs(deltaY) > 0) {
                el.style.transition = 'none';
                el.style.transform = `translateY(${deltaY}px)`;

                el.getBoundingClientRect();

                el.style.transition = 'transform 0.4s ease';
                el.style.transform = 'translateY(0)';

                el.style.background = deltaY > 0
                    ? 'rgba(0, 100, 0, 0.8)'
                    : 'rgba(100, 0, 0, 0.8)';
            } else {
                el.style.background = 'rgba(0,0,0,0.3)';
            }
        });

        this.lastRankingOrder = newOrder;
    }

    colorLerp(color1, color2, t){
        const r = Math.round(this.lerp(color1.r, color2.r, t));
        const g = Math.round(this.lerp(color1.g, color2.g, t));
        const b = Math.round(this.lerp(color1.b, color2.b, t));

        return `rgb(${r},${g},${b})`
    }

    lerp(first, second, t){
        return first + (second - first) * t;
    }

    hideForObserver(){
        document.getElementById('road-progress-bar').style.visibility = 'hidden';
        this.roadProgressFill.style.visibility = 'hidden';
        this.lapTxt.style.visibility = 'hidden';
        this.speedBar.style.visibility = 'hidden';
        this.speedFill.style.visibility = 'hidden';
    }
}