import { GEM_GRADES, GEM_ORDER, GEM_TYPES, TOWER_RULES } from '../data/gems.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { WAVES } from '../data/waves.js';

const MAX_GRADE = Math.max(...Object.keys(GEM_GRADES).map(Number));

export class DefenseSystem {
    constructor(game, level) {
        this.game = game;
        this.level = level;
        this.pathCells = new Set(level.path.map(p => keyFor(p.gx, p.gy)));
        this.padCells = new Set(level.buildPads.map(p => keyFor(p.gx, p.gy)));
        this.pathPoints = level.path.map(p => ({ x: p.gx + 0.5, y: p.gy + 0.5 }));
        this.selectedGemTypeId = GEM_ORDER[0];
        this.showRangeOverlay = true;
        this.speed = 1;
        this.resetState();
    }

    resetState() {
        this.mana = TOWER_RULES.startingMana;
        this.maxMana = TOWER_RULES.startingMaxMana;
        this.poolLevel = 0;
        this.waveIndex = 0;
        this.waveActive = false;
        this.paused = false;
        this.gameOver = false;
        this.victory = false;
        this.elapsed = 0;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.selectedTowerId = null;
        this._nextTowerId = 1;
        this._nextEnemyId = 1;
        this._nextProjectileId = 1;
        this._nextParticleId = 1;
        this._spawnGroupIndex = 0;
        this._spawnedInGroup = 0;
        this._spawnTimer = 0;
        this._spawnedInWave = 0;
        this._waveTotal = 0;
    }

    loadLevel() {
        const tm = this.game.tileMap;
        tm.resize(this.level.width, this.level.height);
        this.resetState();

        for (let gy = 0; gy < this.level.terrainRows.length; gy++) {
            const row = this.level.terrainRows[gy];
            for (let gx = 0; gx < row.length; gx++) {
                const terrainId = this.level.terrainLegend[row[gx]];
                if (terrainId) tm.setTerrain(gx, gy, terrainId);
            }
        }

        for (let i = 0; i < this.level.decorations.length; i++) {
            const d = this.level.decorations[i];
            const result = this.game.placement.place(d.assetId, d.gx, d.gy, {
                flipH: d.flipH === true,
                flipV: d.flipV === true,
            });
            if (result?.kind === 'object') {
                const obj = result.object;
                this.game.renderer.spawnAnim(`obj-${obj.id}`, {
                    gx: obj.gx,
                    gy: obj.gy,
                    w: obj.footprint?.w ?? 1,
                    d: obj.footprint?.d ?? 1,
                }, 420, performance.now() + i * 24);
            }
        }
    }

    get waves() { return WAVES; }
    get selectedGemType() { return GEM_TYPES[this.selectedGemTypeId]; }
    get selectedTower() { return this.towers.find(t => t.id === this.selectedTowerId) ?? null; }
    get nextWave() { return WAVES[this.waveIndex] ?? null; }
    get activeWave() { return this.waveActive ? WAVES[this.waveIndex] : null; }
    get manaIncomeMultiplier() { return 1 + this.poolLevel * TOWER_RULES.poolIncomeBonus; }
    get passiveIncome() { return TOWER_RULES.passiveManaPerSecond * this.manaIncomeMultiplier; }
    get buildCost() { return TOWER_RULES.towerCost + GEM_GRADES[1].cost; }

    statusText() {
        if (this.gameOver) return 'Cistern dry';
        if (this.victory) return 'Harbor held';
        if (this.paused) return 'Paused';
        if (this.waveActive) return 'Wave in harbor';
        return 'Planning';
    }

    waveLabel() {
        const shown = Math.min(WAVES.length, this.waveIndex + 1);
        return `${shown} / ${WAVES.length}`;
    }

    setGemType(typeId) {
        if (!GEM_TYPES[typeId]) return;
        this.selectedGemTypeId = typeId;
        this.game.renderer.markDirty();
        this.game.ui?.update();
    }

    toggleRangeOverlay() {
        this.showRangeOverlay = !this.showRangeOverlay;
        this.game.renderer.markDirty();
        this.game.ui?.showToast(`Ranges ${this.showRangeOverlay ? 'shown' : 'hidden'}`);
        this.game.ui?.update();
    }

    padAt(gx, gy) {
        return this.level.buildPads.find(p => p.gx === gx && p.gy === gy) ?? null;
    }

    isPathCell(gx, gy) {
        return this.pathCells.has(keyFor(gx, gy));
    }

    isBuildPad(gx, gy) {
        return this.padCells.has(keyFor(gx, gy));
    }

    towerAt(gx, gy) {
        return this.towers.find(t => t.gx === gx && t.gy === gy) ?? null;
    }

    towerForObjectId(objectId) {
        return this.towers.find(t => t.objectId === objectId) ?? null;
    }

    canBuildAt(gx, gy) {
        return this.isBuildPad(gx, gy)
            && !this.towerAt(gx, gy)
            && this.game.tileMap.isFreeFor(gx, gy, 1, 1);
    }

    buildTowerAt(gx, gy) {
        const existing = this.towerAt(gx, gy);
        if (existing) {
            this.selectTower(existing.id);
            return true;
        }
        if (!this.canBuildAt(gx, gy)) {
            this.game.ui?.showToast(this.isBuildPad(gx, gy) ? 'That pad is occupied' : 'Build on blue ceramic pads');
            return false;
        }
        const cost = this.buildCost;
        if (!this.spend(cost)) {
            this.game.ui?.showToast(`Need ${cost} aether`);
            return false;
        }
        const result = this.game.placement.place(TOWER_RULES.towerAssetId, gx, gy);
        if (result?.kind !== 'object') {
            this.addMana(cost);
            this.game.ui?.showToast('That plinth cannot be raised here');
            return false;
        }
        const obj = result.object;
        const tower = {
            id: this._nextTowerId++,
            objectId: obj.id,
            gx,
            gy,
            gem: { type: this.selectedGemTypeId, grade: 1 },
            cooldown: 0.2,
            shots: 0,
            critMeter: 0,
            chainMeter: 0,
            invested: cost,
        };
        this.towers.push(tower);
        this.selectedTowerId = tower.id;
        this.game.renderer.spawnAnim(`obj-${obj.id}`, { gx, gy, w: 1, d: 1 });
        this.game.renderer.markDirty();
        this.game.ui?.showToast(`${GEM_TYPES[tower.gem.type].shortName} prism set`);
        this.game.ui?.update();
        return true;
    }

    selectTowerAt(gx, gy) {
        const tower = this.towerAt(gx, gy);
        if (!tower) return false;
        this.selectTower(tower.id);
        return true;
    }

    selectTower(id) {
        this.selectedTowerId = id;
        this.game.renderer.markDirty();
        this.game.ui?.update();
    }

    clearSelection() {
        if (this.selectedTowerId == null) return;
        this.selectedTowerId = null;
        this.game.renderer.markDirty();
        this.game.ui?.update();
    }

    sellTowerAt(gx, gy) {
        const tower = this.towerAt(gx, gy);
        if (!tower) return false;
        this.sellTower(tower);
        return true;
    }

    sellSelectedTower() {
        const tower = this.selectedTower;
        if (!tower) {
            this.game.ui?.showToast('Select a prism plinth first');
            return false;
        }
        this.sellTower(tower);
        return true;
    }

    sellTower(tower) {
        const refund = Math.ceil(tower.invested * TOWER_RULES.sellRefund);
        this.game.tileMap.removeObjectAt(tower.gx, tower.gy);
        this.towers = this.towers.filter(t => t.id !== tower.id);
        if (this.selectedTowerId === tower.id) this.selectedTowerId = null;
        this.addMana(refund);
        this.game.renderer.markDirty();
        this.game.ui?.showToast(`Recovered ${refund} aether`);
        this.game.ui?.update();
    }

    upgradeSelectedTower() {
        const tower = this.selectedTower;
        if (!tower) {
            this.game.ui?.showToast('Select a prism plinth first');
            return false;
        }
        const nextGrade = tower.gem.grade + 1;
        if (!GEM_GRADES[nextGrade]) {
            this.game.ui?.showToast('That prism is fully focused');
            return false;
        }
        const cost = this.combineCost(tower);
        if (!this.spend(cost)) {
            this.game.ui?.showToast(`Need ${cost} aether to combine`);
            return false;
        }
        tower.gem.grade = nextGrade;
        tower.cooldown = Math.min(tower.cooldown, 0.15);
        tower.invested += cost;
        this.spawnBurst(tower.gx + 0.5, tower.gy + 0.5, GEM_TYPES[tower.gem.type].color, `Grade ${GEM_GRADES[nextGrade].label}`);
        this.game.renderer.markDirty();
        this.game.ui?.showToast(`${GEM_TYPES[tower.gem.type].shortName} prism grade ${GEM_GRADES[nextGrade].label}`);
        this.game.ui?.update();
        return true;
    }

    combineCost(tower) {
        const nextGrade = tower.gem.grade + 1;
        const next = GEM_GRADES[nextGrade];
        return next ? Math.ceil(next.cost * 0.55) : 0;
    }

    upgradePool() {
        const cost = TOWER_RULES.poolCosts[this.poolLevel];
        if (cost == null) {
            this.game.ui?.showToast('The cistern is fully deepened');
            return false;
        }
        if (!this.spend(cost)) {
            this.game.ui?.showToast(`Need ${cost} aether for the cistern`);
            return false;
        }
        this.poolLevel++;
        this.maxMana += TOWER_RULES.poolMaxBonus;
        this.addMana(80);
        this.game.renderer.markDirty();
        this.game.ui?.showToast(`Cistern level ${this.poolLevel}`);
        this.game.ui?.update();
        return true;
    }

    poolCost() {
        return TOWER_RULES.poolCosts[this.poolLevel] ?? null;
    }

    startNextWave() {
        if (this.gameOver || this.victory) return false;
        if (this.waveActive) {
            this.game.ui?.showToast('Wave already in harbor');
            return false;
        }
        if (!WAVES[this.waveIndex]) {
            this.victory = true;
            this.game.ui?.showToast('The harbor is safe');
            return false;
        }
        this.waveActive = true;
        this._spawnGroupIndex = 0;
        this._spawnedInGroup = 0;
        this._spawnTimer = 0;
        this._spawnedInWave = 0;
        this._waveTotal = WAVES[this.waveIndex].groups.reduce((sum, g) => sum + g.count, 0);
        this.game.renderer.markDirty();
        this.game.ui?.showToast(WAVES[this.waveIndex].name);
        this.game.ui?.update();
        return true;
    }

    cycleSpeed() {
        this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
        this.game.ui?.showToast(`${this.speed}x speed`);
        this.game.ui?.update();
    }

    togglePause() {
        this.paused = !this.paused;
        this.game.ui?.showToast(this.paused ? 'Paused' : 'Resumed');
        this.game.ui?.update();
    }

    spend(amount) {
        if (this.mana < amount) return false;
        this.mana -= amount;
        if (this.mana <= 0) this.gameOver = true;
        return true;
    }

    addMana(amount) {
        this.mana = Math.min(this.maxMana, this.mana + amount);
    }

    update(dt) {
        if (this.paused || this.gameOver || this.victory) {
            return this.projectiles.length > 0 || this.particles.length > 0;
        }

        const step = Math.min(0.08, Math.max(0, dt)) * this.speed;
        if (step <= 0) return false;
        this.elapsed += step;
        this.addMana(this.passiveIncome * step);

        this._updateSpawning(step);
        this._updateEnemies(step);
        this._updateTowers(step);
        this._updateProjectiles(step);
        this._updateParticles(step);
        this._finishWaveIfDone();

        return this.waveActive
            || this.enemies.length > 0
            || this.projectiles.length > 0
            || this.particles.length > 0;
    }

    towerCenter(tower) {
        return { x: tower.gx + 0.5, y: tower.gy + 0.5 };
    }

    towerDamage(tower) {
        const grade = GEM_GRADES[tower.gem.grade];
        return Math.round(TOWER_RULES.baseDamage * grade.damageMult);
    }

    towerRange(tower) {
        return TOWER_RULES.baseRange + tower.gem.grade * TOWER_RULES.rangePerGrade;
    }

    towerCooldown(tower) {
        return Math.max(0.34, TOWER_RULES.baseCooldown - tower.gem.grade * TOWER_RULES.cooldownPerGrade);
    }

    _updateSpawning(dt) {
        if (!this.waveActive) return;
        this._spawnTimer -= dt;
        while (this._spawnTimer <= 0) {
            const wave = WAVES[this.waveIndex];
            const group = wave?.groups[this._spawnGroupIndex];
            if (!group) return;
            this._spawnEnemy(group);
            this._spawnedInGroup++;
            this._spawnedInWave++;
            if (this._spawnedInGroup >= group.count) {
                this._spawnGroupIndex++;
                this._spawnedInGroup = 0;
                this._spawnTimer += group.gapAfter ?? 0.95;
            } else {
                this._spawnTimer += group.interval;
            }
            if (this._spawnTimer > 0) return;
        }
    }

    _spawnEnemy(group) {
        const start = this.pathPoints[0];
        const type = ENEMY_TYPES[group.type];
        this.enemies.push({
            id: this._nextEnemyId++,
            type: group.type,
            name: type?.name ?? group.type,
            x: start.x,
            y: start.y,
            pathIndex: 0,
            pathProgress: 0,
            hp: group.hp,
            maxHp: group.hp,
            speed: group.speed,
            armor: group.armor,
            reward: group.reward,
            leak: group.leak,
            slowTime: 0,
            slowFactor: 1,
            poisonTime: 0,
            poisonDps: 0,
            poisonTick: 0,
            alive: true,
            leaked: false,
        });
    }

    _updateEnemies(dt) {
        for (const enemy of this.enemies) {
            if (!enemy.alive || enemy.leaked) continue;
            this._tickStatuses(enemy, dt);
            if (!enemy.alive) continue;
            this._moveEnemy(enemy, dt);
        }
        this.enemies = this.enemies.filter(e => e.alive && !e.leaked);
    }

    _tickStatuses(enemy, dt) {
        if (enemy.slowTime > 0) {
            enemy.slowTime = Math.max(0, enemy.slowTime - dt);
            if (enemy.slowTime === 0) enemy.slowFactor = 1;
        }
        if (enemy.poisonTime > 0 && enemy.poisonDps > 0) {
            const damage = enemy.poisonDps * dt;
            enemy.hp -= damage;
            enemy.poisonTime = Math.max(0, enemy.poisonTime - dt);
            enemy.poisonTick += dt;
            if (enemy.poisonTick >= 0.65) {
                enemy.poisonTick = 0;
                this.spawnLabel(enemy.x, enemy.y, Math.ceil(damage * 5), '#6f9f58');
            }
            if (enemy.poisonTime === 0) enemy.poisonDps = 0;
            if (enemy.hp <= 0) this._killEnemy(enemy, '#6f9f58');
        }
    }

    _moveEnemy(enemy, dt) {
        let distance = enemy.speed * enemy.slowFactor * dt;
        while (distance > 0 && enemy.pathIndex < this.pathPoints.length - 1) {
            const next = this.pathPoints[enemy.pathIndex + 1];
            const dx = next.x - enemy.x;
            const dy = next.y - enemy.y;
            const remaining = Math.hypot(dx, dy);
            if (remaining <= 0.0001) {
                enemy.pathIndex++;
                continue;
            }
            if (distance >= remaining) {
                enemy.x = next.x;
                enemy.y = next.y;
                enemy.pathIndex++;
                distance -= remaining;
            } else {
                enemy.x += dx / remaining * distance;
                enemy.y += dy / remaining * distance;
                distance = 0;
            }
        }
        const next = this.pathPoints[Math.min(enemy.pathIndex + 1, this.pathPoints.length - 1)];
        const here = this.pathPoints[enemy.pathIndex];
        const segment = Math.max(0.0001, Math.hypot(next.x - here.x, next.y - here.y));
        const along = Math.hypot(enemy.x - here.x, enemy.y - here.y) / segment;
        enemy.pathProgress = enemy.pathIndex + Math.min(1, along);

        if (enemy.pathIndex >= this.pathPoints.length - 1) {
            this._leakEnemy(enemy);
        }
    }

    _updateTowers(dt) {
        if (this.enemies.length === 0) return;
        for (const tower of this.towers) {
            tower.cooldown = Math.max(0, tower.cooldown - dt);
            if (tower.cooldown > 0) continue;
            const target = this._findTarget(tower);
            if (!target) continue;
            this._fireTower(tower, target);
            tower.cooldown += this.towerCooldown(tower);
        }
        this.enemies = this.enemies.filter(e => e.alive && !e.leaked);
    }

    _findTarget(tower) {
        const c = this.towerCenter(tower);
        const range = this.towerRange(tower);
        let best = null;
        for (const enemy of this.enemies) {
            if (!enemy.alive || enemy.leaked) continue;
            if (distance(c, enemy) > range) continue;
            if (!best || enemy.pathProgress > best.pathProgress || (enemy.pathProgress === best.pathProgress && enemy.id < best.id)) {
                best = enemy;
            }
        }
        return best;
    }

    _fireTower(tower, target) {
        tower.shots++;
        const gem = GEM_TYPES[tower.gem.type];
        const grade = tower.gem.grade;
        let damage = this.towerDamage(tower);
        let critical = false;

        if (tower.gem.type === 'coral') {
            const chance = Math.min(0.55, 0.12 + 0.06 * grade);
            tower.critMeter += chance;
            if (tower.critMeter >= 1) {
                tower.critMeter -= 1;
                damage = Math.round(damage * 2.4);
                critical = true;
            }
        }

        const from = this.towerCenter(tower);
        const to = { x: target.x, y: target.y };
        this.spawnProjectile({ from, to, color: gem.color, kind: tower.gem.type, critical });
        this._damageEnemy(target, damage, { color: gem.color, critical });

        if (tower.gem.type === 'amber') this._splash(target, damage, grade, gem.color);
        if (tower.gem.type === 'jade') this._poison(target, damage, grade);
        if (tower.gem.type === 'opal') this._slow(target, grade);
        if (tower.gem.type === 'cobalt') this._chain(tower, target, damage, grade, gem.color);
    }

    _splash(target, damage, grade, color) {
        const radius = 1.0 + 0.08 * grade;
        const maxTargets = 4 + Math.floor(grade / 2);
        const nearby = this.enemies
            .filter(e => e !== target && e.alive && !e.leaked && distance(target, e) <= radius)
            .sort((a, b) => distance(target, a) - distance(target, b) || a.id - b.id)
            .slice(0, maxTargets);
        for (const enemy of nearby) {
            this._damageEnemy(enemy, Math.round(damage * 0.4), { color });
        }
        this.particles.push({
            id: this._nextParticleId++,
            kind: 'ring',
            x: target.x,
            y: target.y,
            radius,
            color,
            life: 0.38,
            maxLife: 0.38,
        });
    }

    _poison(target, damage, grade) {
        if (!target.alive) return;
        const duration = 5;
        const dps = damage * (0.45 + grade * 0.035) / duration;
        target.poisonDps = Math.min(dps * 3, target.poisonDps + dps);
        target.poisonTime = duration;
    }

    _slow(target, grade) {
        if (!target.alive) return;
        const slow = Math.min(0.55, 0.25 + 0.04 * grade);
        target.slowFactor = Math.min(target.slowFactor, Math.max(0.4, 1 - slow));
        target.slowTime = Math.max(target.slowTime, 2.5 + 0.2 * grade);
    }

    _chain(tower, firstTarget, damage, grade, color) {
        const chance = Math.min(0.6, 0.25 + 0.05 * grade);
        tower.chainMeter += chance;
        if (tower.chainMeter < 1) return;
        tower.chainMeter -= 1;

        const jumps = 1 + Math.floor(grade / 3);
        const hit = new Set([firstTarget.id]);
        let source = firstTarget;
        let chainedDamage = Math.round(damage * 0.65);
        const segments = [];

        for (let i = 0; i < jumps; i++) {
            const next = this.enemies
                .filter(e => e.alive && !e.leaked && !hit.has(e.id) && distance(source, e) <= 3.1)
                .sort((a, b) => distance(source, a) - distance(source, b) || a.id - b.id)[0];
            if (!next) break;
            segments.push({ from: { x: source.x, y: source.y }, to: { x: next.x, y: next.y } });
            this._damageEnemy(next, chainedDamage, { color });
            hit.add(next.id);
            source = next;
            chainedDamage = Math.max(1, Math.round(chainedDamage * 0.65));
        }

        if (segments.length > 0) {
            this.projectiles.push({
                id: this._nextProjectileId++,
                kind: 'chain',
                color,
                segments,
                t: 0,
                duration: 0.28,
            });
        }
    }

    _damageEnemy(enemy, rawDamage, opts = {}) {
        if (!enemy.alive || enemy.leaked) return 0;
        const armor = opts.ignoreArmor ? 0 : enemy.armor;
        const dealt = Math.max(1, Math.round(rawDamage - armor));
        enemy.hp -= dealt;
        this.spawnLabel(enemy.x, enemy.y, dealt, opts.critical ? '#e5c065' : opts.color ?? '#2b2a26', opts.critical);
        if (enemy.hp <= 0) this._killEnemy(enemy, opts.color ?? '#2b2a26');
        return dealt;
    }

    _killEnemy(enemy, color) {
        if (!enemy.alive) return;
        enemy.alive = false;
        const reward = Math.ceil(enemy.reward * this.manaIncomeMultiplier);
        this.addMana(reward);
        this.spawnBurst(enemy.x, enemy.y, color, `+${reward}`);
    }

    _leakEnemy(enemy) {
        enemy.leaked = true;
        this.mana = Math.max(0, this.mana - enemy.leak);
        this.spawnBurst(enemy.x, enemy.y, '#c4622e', `-${enemy.leak}`);
        if (this.mana <= 0) {
            this.gameOver = true;
            this.waveActive = false;
            this.game.ui?.showToast('The cistern ran dry', 2400);
        }
    }

    _updateProjectiles(dt) {
        for (const p of this.projectiles) p.t += dt / p.duration;
        this.projectiles = this.projectiles.filter(p => p.t < 1);
    }

    _updateParticles(dt) {
        for (const p of this.particles) p.life -= dt;
        this.particles = this.particles.filter(p => p.life > 0);
    }

    _finishWaveIfDone() {
        if (!this.waveActive) return;
        const wave = WAVES[this.waveIndex];
        const allSpawned = this._spawnGroupIndex >= (wave?.groups.length ?? 0);
        if (!allSpawned || this.enemies.length > 0) return;
        this.waveActive = false;
        const clearBonus = 70 + this.waveIndex * 18;
        this.addMana(clearBonus);
        this.waveIndex++;
        if (this.waveIndex >= WAVES.length) {
            this.victory = true;
            this.game.ui?.showToast('The harbor is safe', 2600);
        } else {
            this.game.ui?.showToast(`Wave held: +${clearBonus} aether`);
        }
        this.game.ui?.update();
    }

    spawnProjectile(projectile) {
        this.projectiles.push({
            id: this._nextProjectileId++,
            t: 0,
            duration: projectile.critical ? 0.16 : 0.22,
            ...projectile,
        });
    }

    spawnLabel(x, y, text, color, large = false) {
        this.particles.push({
            id: this._nextParticleId++,
            kind: 'label',
            x,
            y,
            text: String(text),
            color,
            large,
            life: large ? 0.7 : 0.48,
            maxLife: large ? 0.7 : 0.48,
        });
    }

    spawnBurst(x, y, color, text = '') {
        this.particles.push({
            id: this._nextParticleId++,
            kind: 'burst',
            x,
            y,
            text,
            color,
            life: 0.7,
            maxLife: 0.7,
        });
    }
}

function keyFor(gx, gy) {
    return `${gx},${gy}`;
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
