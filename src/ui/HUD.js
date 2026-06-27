import { playUiClick } from './Audio.js';

export class HUD {
    constructor(game) {
        this.game = game;
        this.root = document.getElementById('hud');
        this._build();
    }

    _build() {
        this.root.innerHTML = `
            <div class="mana-card">
                <div class="mana-top"><span>Aether cistern</span><strong id="mana-value"></strong></div>
                <div class="mana-bar"><div id="mana-fill"></div></div>
                <div class="mana-sub" id="mana-sub"></div>
            </div>
            <div class="wave-card">
                <div><span class="eyebrow">Wave</span><strong id="wave-value"></strong></div>
                <div><span class="eyebrow">Status</span><strong id="status-value"></strong></div>
                <div><span class="eyebrow">Enemies</span><strong id="enemy-value"></strong></div>
            </div>
            <div class="hud-actions">
                <button type="button" class="hud-btn primary" id="call-wave">Call wave</button>
                <button type="button" class="hud-btn" id="pause-wave">Pause</button>
                <button type="button" class="hud-btn" id="speed-wave">1x</button>
            </div>
        `;
        this.manaValue = this.root.querySelector('#mana-value');
        this.manaFill = this.root.querySelector('#mana-fill');
        this.manaSub = this.root.querySelector('#mana-sub');
        this.waveValue = this.root.querySelector('#wave-value');
        this.statusValue = this.root.querySelector('#status-value');
        this.enemyValue = this.root.querySelector('#enemy-value');
        this.callBtn = this.root.querySelector('#call-wave');
        this.pauseBtn = this.root.querySelector('#pause-wave');
        this.speedBtn = this.root.querySelector('#speed-wave');

        this.callBtn.addEventListener('click', () => {
            playUiClick();
            this.game.defense.startNextWave();
        });
        this.pauseBtn.addEventListener('click', () => {
            playUiClick();
            this.game.defense.togglePause();
        });
        this.speedBtn.addEventListener('click', () => {
            playUiClick();
            this.game.defense.cycleSpeed();
        });
        this.update();
    }

    update() {
        const defense = this.game.defense;
        const mana = Math.floor(defense.mana);
        const maxMana = Math.floor(defense.maxMana);
        const pct = Math.max(0, Math.min(100, mana / maxMana * 100));
        this.manaValue.textContent = `${mana} / ${maxMana}`;
        this.manaFill.style.width = `${pct}%`;
        this.manaSub.textContent = `+${defense.passiveIncome.toFixed(1)}/s · pool ${defense.poolLevel}`;
        this.waveValue.textContent = defense.waveLabel();
        this.statusValue.textContent = defense.statusText();
        this.enemyValue.textContent = String(defense.enemies.length);
        this.callBtn.disabled = defense.waveActive || defense.gameOver || defense.victory;
        this.pauseBtn.textContent = defense.paused ? 'Resume' : 'Pause';
        this.pauseBtn.disabled = defense.gameOver || defense.victory;
        this.speedBtn.textContent = `${defense.speed}x`;
    }

    syncToggles() {}
}
