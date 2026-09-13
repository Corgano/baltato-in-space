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
    } else if (key === "critMultiplier" || key === "damage" || key === "maxHealth" || key === "armor" || key === "speed" || key === "luck") {
      player[key] = Math.min(limits[key], Math.max(0, value));
    } else {
      player[key] = Math.min(limits[key], Math.max(0, value));
    }
  }

  player.critChance = Math.min(0.95, Math.max(0, balttatoStatFinite(player.critChance, 0.08)));
}

const balttatoOriginalAutoCombatStatSafety = GameManager.prototype.handleAutoCombat;
GameManager.prototype.handleAutoCombat = function(dt) {
  balttatoApplyStatSafety(this.player);

  // Stop projectile multiplication from consuming the browser event loop.
  if (this.projectiles.length >= 300) return;

  balttatoOriginalAutoCombatStatSafety.call(this, dt);
};

const balttatoOriginalUpdateEntitiesStatSafety = GameManager.prototype.updateEntities;
GameManager.prototype.updateEntities = function(dt) {
  balttatoApplyStatSafety(this.player);
  balttatoOriginalUpdateEntitiesStatSafety.call(this, dt);
};

const balttatoOriginalCheckCollisionsStatSafety = GameManager.prototype.checkCollisions;
GameManager.prototype.checkCollisions = function() {
  balttatoApplyStatSafety(this.player);
  balttatoOriginalCheckCollisionsStatSafety.call(this);
};

const balttatoOriginalFinalizeStatSafety = GameManager.prototype.finalizeCardSelection;
GameManager.prototype.finalizeCardSelection = function(index) {
  balttatoOriginalFinalizeStatSafety.call(this, index);
  balttatoApplyStatSafety(this.player);
};

// Keep chained visual effects bounded. Their probabilities still scale from
// Luck and upgrade ranks, but a single frame cannot create an unbounded tree.
const balttatoOriginalCreateChainEffectStatSafety = balttatoCreateChainExplosion;
balttatoCreateChainExplosion = function(game, x, y, damage, depth) {
  if (depth > 5 || game.blastEffects.length >= 48) return;
  balttatoOriginalCreateChainEffectStatSafety(game, x, y, damage, depth);
};

// Large stat values are useful as progression records, but collision work must
// remain bounded. The gameplay layer reads these same effective values.
const balttatoOriginalProcessWaveStatSafety = balttatoProcessBlastWave;
balttatoProcessBlastWave = function(game, blast, dt) {
  if (game.enemies.length > 250) return;
  balttatoOriginalProcessWaveStatSafety(game, blast, dt);
};

// Replace verbose upgrade descriptions with a large, readable stat-delta block.
// Scaling/cap information stays in the pause-screen tooltips.
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

logDebug(1, "Stat rewrite safety layer enabled", {
  projectileBudget: 300,
  activeChainDepth: 5,
  activeBlastBudget: 48,
  maxMultishot: 24,
  maxFragmentation: 12,
  maxPenetration: 16,
  maxChainLinks: 12
});
