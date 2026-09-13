/*
 * Final stat-system layer. Keeps upgrade cards focused on stat deltas and
 * prevents high-cardinality values from overwhelming the simulation.
 */

function balttatoStatFinite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function balttatoApplyStatSafety(player) {
  const limits = {
    chainHits: 12,
    multishotCount: 24,
    pierceCount: 16,
    fragmentation: 12,
    ricochetCount: 20,
    blastRadius: 500,
    weaponRange: 1200,
    projectileSpeed: 5000,
    magnetRadius: 1600,
    fireInterval: 0.08,
    speed: 10000,
    damage: 1000000,
    critMultiplier: 1000,
    maxHealth: 1000000,
    armor: 1000000,
    luck: 100000
  };

  for (const key of Object.keys(limits)) {
    const value = balttatoStatFinite(player[key], 0);
    if (key === "fireInterval") {
      player[key] = Math.max(limits[key], value);
    } else {
      player[key] = Math.min(limits[key], Math.max(0, value));
    }
  }

  player.critChance = Math.min(0.95, Math.max(0, balttatoStatFinite(player.critChance, 0.08)));
}

function balttatoApplyEntitySafety(game) {
  const budgets = {
    projectiles: 300,
    enemyProjectiles: 200,
    enemies: 150,
    blastEffects: 48,
    lightningArcs: 150,
    floatingTexts: 250,
    droppedItems: 500
  };

  for (const key of Object.keys(budgets)) {
    const array = game[key];
    if (!Array.isArray(array) || array.length <= budgets[key]) continue;

    const excess = array.length - budgets[key];
    if (key === "enemies") {
      let removed = 0;
      for (let i = 0; i < array.length && removed < excess; i++) {
        if (!array[i].isBoss && !array[i].isDestroyed) {
          array[i].isDestroyed = true;
          removed += 1;
        }
      }
    } else if (key === "projectiles" || key === "enemyProjectiles" || key === "blastEffects" || key === "lightningArcs" || key === "floatingTexts") {
      for (let i = 0; i < excess; i++) {
        if (array[i]) array[i].isDestroyed = true;
      }
    } else {
      array.splice(0, excess);
    }

    logDebug(1, "Entity safety budget applied", {
      collection: key,
      count: array.length,
      budget: budgets[key]
    });
  }
}

const balttatoOriginalAutoCombatStatSafety = GameManager.prototype.handleAutoCombat;
GameManager.prototype.handleAutoCombat = function(dt) {
  balttatoApplyStatSafety(this.player);
  balttatoApplyEntitySafety(this);
  if (this.projectiles.length >= 300) return;
  balttatoOriginalAutoCombatStatSafety.call(this, dt);
};

const balttatoOriginalUpdateEntitiesStatSafety = GameManager.prototype.updateEntities;
GameManager.prototype.updateEntities = function(dt) {
  balttatoApplyStatSafety(this.player);
  balttatoOriginalUpdateEntitiesStatSafety.call(this, dt);
  balttatoApplyEntitySafety(this);
};

const balttatoOriginalCheckCollisionsStatSafety = GameManager.prototype.checkCollisions;
GameManager.prototype.checkCollisions = function() {
  balttatoApplyStatSafety(this.player);
  balttatoOriginalCheckCollisionsStatSafety.call(this);
  balttatoApplyEntitySafety(this);
};

const balttatoOriginalFinalizeStatSafety = GameManager.prototype.finalizeCardSelection;
GameManager.prototype.finalizeCardSelection = function(index) {
  balttatoOriginalFinalizeStatSafety.call(this, index);
  balttatoApplyStatSafety(this.player);
};

const balttatoOriginalCreateChainEffectStatSafety = balttatoCreateChainExplosion;
balttatoCreateChainExplosion = function(game, x, y, damage, depth) {
  if (depth > 5 || game.blastEffects.length >= 48) return;
  balttatoOriginalCreateChainEffectStatSafety(game, x, y, damage, depth);
};

const balttatoOriginalProcessWaveStatSafety = balttatoProcessBlastWave;
balttatoProcessBlastWave = function(game, blast, dt) {
  if (game.enemies.length > 150) return;
  balttatoOriginalProcessWaveStatSafety(game, blast, dt);
};

// Cards show only the affected stat and this rank's gain. Scaling/cap details
// are intentionally kept off the card face.
const balttatoOriginalDrawStatsOnly = UpgradeManager.prototype.drawOverlay;
UpgradeManager.prototype.drawOverlay = function(ctx, canvasW, canvasH, playerLevel, burnInfo = null) {
  const savedDescriptions = [];
  const statLines = [];
  const player = window.__arenaGameInstance ? window.__arenaGameInstance.player : null;

  for (let i = 0; i < this.activeCards.length; i++) {
    const card = this.activeCards[i];
    savedDescriptions.push(card.description);
    if (!card.isJoker) {
      const text = balttatoFormatUpgradeStats(card, player);
      statLines.push(text ? text.split("\\n") : []);
      card.description = "";
    } else {
      statLines.push([]);
    }
  }

  try {
    balttatoOriginalDrawStatsOnly.call(this, ctx, canvasW, canvasH, playerLevel, burnInfo);

    const rects = this.getCardLayout(canvasW, canvasH);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < this.activeCards.length; i++) {
      const card = this.activeCards[i];
      if (card.isJoker || !statLines[i] || statLines[i].length === 0) continue;
      const r = rects[i];
      ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#f8fafc";
      const lines = statLines[i];
      const startY = r.y + 106 - (lines.length - 1) * 10;
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        ctx.fillText(lines[lineIndex], r.x + r.w / 2, startY + lineIndex * 20);
      }
    }
    ctx.restore();
  } finally {
    for (let i = 0; i < this.activeCards.length && i < savedDescriptions.length; i++) {
      this.activeCards[i].description = savedDescriptions[i];
    }
  }
};

// Put implementation details in the pause-screen hover text, not on cards.
for (let i = 0; i < BALTTATO_STAT_DEFINITIONS.length; i++) {
  const definition = BALTTATO_STAT_DEFINITIONS[i];
  const relatedIds = [];
  for (const id of Object.keys(BALTTATO_UPGRADE_SCALING)) {
    const config = BALTTATO_UPGRADE_SCALING[id];
    if (config.effects.some((effect) => effect.key === definition.key)) relatedIds.push(id);
  }
  if (relatedIds.length > 0) {
    const details = relatedIds.map((id) => BALTTATO_UPGRADE_SCALING[id].tooltip).join(" ");
    definition.tooltip = `${definition.tooltip} ${details}`;
  }
}

logDebug(1, "Stat rewrite safety layer enabled", {
  projectileBudget: 300,
  enemyProjectileBudget: 200,
  enemyBudget: 150,
  activeChainDepth: 5,
  activeBlastBudget: 48,
  maxMultishot: 24,
  maxFragmentation: 12,
  maxPenetration: 16,
  maxChainLinks: 12,
  maxRicochet: 20,
  maxProjectileSpeed: 5000
});
