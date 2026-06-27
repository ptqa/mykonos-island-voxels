import { GEM_GRADES, GEM_ORDER, GEM_TYPES } from '../data/gems.js';
import { playUiClick } from './Audio.js';

export class ForgePanel {
    constructor(rootEl, game) {
        this.root = rootEl;
        this.game = game;
        this.gemButtons = new Map();
        this._build();
    }

    _build() {
        this.root.innerHTML = `
            <div class="forge-head">
                <div>
                    <div class="eyebrow">Prism forge</div>
                    <h2>Socket sea-lit gems</h2>
                </div>
                <div class="forge-cost" id="forge-build-cost"></div>
            </div>
            <div class="gem-list" id="gem-list"></div>
            <div class="forge-hint" id="forge-hint"></div>
            <div class="tower-card" id="tower-card"></div>
            <div class="forge-actions">
                <button type="button" class="panel-btn primary" id="upgrade-gem">Combine gem</button>
                <button type="button" class="panel-btn" id="sell-tower">Sell plinth</button>
                <button type="button" class="panel-btn" id="toggle-ranges">Ranges</button>
            </div>
        `;

        this.buildCostEl = this.root.querySelector('#forge-build-cost');
        this.hintEl = this.root.querySelector('#forge-hint');
        this.towerCardEl = this.root.querySelector('#tower-card');
        this.upgradeBtn = this.root.querySelector('#upgrade-gem');
        this.sellBtn = this.root.querySelector('#sell-tower');
        this.rangeBtn = this.root.querySelector('#toggle-ranges');

        const list = this.root.querySelector('#gem-list');
        for (const id of GEM_ORDER) {
            const gem = GEM_TYPES[id];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'gem-choice';
            btn.dataset.gemId = id;
            btn.innerHTML = `
                <span class="gem-chip" style="--gem:${gem.color};--gem-deep:${gem.deepColor}"></span>
                <span class="gem-copy"><strong>${gem.shortName}</strong><small>${gem.effect}</small></span>
                <span class="gem-key">${GEM_ORDER.indexOf(id) + 1}</span>
            `;
            btn.addEventListener('click', () => {
                playUiClick();
                this.game.defense.setGemType(id);
            });
            list.appendChild(btn);
            this.gemButtons.set(id, btn);
        }

        this.upgradeBtn.addEventListener('click', () => {
            playUiClick();
            this.game.defense.upgradeSelectedTower();
        });
        this.sellBtn.addEventListener('click', () => {
            playUiClick();
            this.game.defense.sellSelectedTower();
        });
        this.rangeBtn.addEventListener('click', () => {
            playUiClick();
            this.game.defense.toggleRangeOverlay();
        });

        this.update();
    }

    update() {
        const defense = this.game.defense;
        const selectedGem = defense.selectedGemType;
        this.buildCostEl.textContent = `${defense.buildCost} aether`;
        this.hintEl.textContent = `Click a blue ceramic pad to build a ${selectedGem.shortName.toLowerCase()} plinth.`;

        for (const [id, btn] of this.gemButtons) {
            btn.classList.toggle('selected', id === defense.selectedGemTypeId);
        }

        const tower = defense.selectedTower;
        if (!tower) {
            this.towerCardEl.innerHTML = `
                <div class="empty-title">No plinth selected</div>
                <p>Build on a blue pad or click an existing plinth to inspect range, damage, and combine cost.</p>
            `;
            this.upgradeBtn.disabled = true;
            this.sellBtn.disabled = true;
            this.rangeBtn.classList.toggle('active', defense.showRangeOverlay);
            return;
        }

        const gem = GEM_TYPES[tower.gem.type];
        const grade = GEM_GRADES[tower.gem.grade];
        const nextCost = defense.combineCost(tower);
        const maxed = !GEM_GRADES[tower.gem.grade + 1];
        this.towerCardEl.innerHTML = `
            <div class="tower-title">
                <span class="gem-chip small" style="--gem:${gem.color};--gem-deep:${gem.deepColor}"></span>
                <div><strong>${gem.name}</strong><small>Grade ${grade.label} ${gem.effect}</small></div>
            </div>
            <div class="tower-stats">
                <span><b>${defense.towerDamage(tower)}</b> damage</span>
                <span><b>${defense.towerRange(tower).toFixed(1)}</b> range</span>
                <span><b>${defense.towerCooldown(tower).toFixed(2)}s</b> focus</span>
            </div>
            <p>${gem.description}</p>
            <div class="combine-note">${maxed ? 'Maximum grade' : `Next combine: ${nextCost} aether`}</div>
        `;
        this.upgradeBtn.textContent = maxed ? 'Fully focused' : `Combine ${nextCost}`;
        this.upgradeBtn.disabled = maxed || defense.mana < nextCost;
        this.sellBtn.disabled = false;
        this.rangeBtn.classList.toggle('active', defense.showRangeOverlay);
    }
}
