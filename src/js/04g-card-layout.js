/*
 * Compact level-up card presentation. The existing card renderer is kept intact;
 * this layer keeps the complete card design at a readable size while ensuring
 * four choices fit within the 800x600 game viewport.
 */

const BALTTATO_CARD_WIDTH = 180;
const BALTTATO_CARD_HEIGHT = 210;
const BALTTATO_CARD_GAP = 12;
const BALTTATO_BASE_FIRE_INTERVAL = 0.55;
const BALTTATO_MAX_FIRE_RATE_PERCENT = 1000;
const BALTTATO_MIN_FIRE_INTERVAL = 0.055;

function balttatoActualCardLayout(canvasW, canvasH) {
  const cardCount = Math.max(1, this.activeCards.length);
  const totalW = BALTTATO_CARD_WIDTH * cardCount + BALTTATO_CARD_GAP * (cardCount - 1);
  const startX = (canvasW - totalW) / 2;
  const startY = canvasH / 2 - 75;
  const rects = [];

  for (let i = 0; i < cardCount; i++) {
    rects.push({
      x: startX + i * (BALTTATO_CARD_WIDTH + BALTTATO_CARD_GAP),
      y: startY,
      w: BALTTATO_CARD_WIDTH,
      h: BALTTATO_CARD_HEIGHT
    });
  }

  return rects;
}

function balttatoDumpPlayerStats(player, upgradeTitle) {
  const stats = {
    upgrade: upgradeTitle,
    x: player.x,
    y: player.y,
    speed: player.speed,
    maxHealth: player.maxHealth,
    health: player.health,
    armor: player.armor,
    fireRatePercent: player.fireRatePercent,
    fireInterval: player.fireInterval,
    damage: player.damage,
    projectileSpeed: player.projectileSpeed,
    weaponRange: player.weaponRange,
    multishotCount: player.multishotCount,
    pierceCount: player.pierceCount,
    critChance: player.critChance,
    critMultiplier: player.critMultiplier,
    chainHits: player.chainHits,
    chainRange: player.chainRange,
    ricochetCount: player.ricochetCount,
    blastRadius: player.blastRadius,
    lifeLeechChance: player.lifeLeechChance,
    fragmentation: player.fragmentation,
    luck: player.luck,
    magnetRadius: player.magnetRadius,
    hasExplosiveBlast: player.hasExplosiveBlast,
    hasSnailMailJoker: player.hasSnailMailJoker,
    hasSuperpositionJoker: player.hasSuperpositionJoker
  };

  console.info("[UPGRADE STATS DUMP]", stats);

  const numericStats = Object.entries(stats).filter(([key, value]) => key !== "upgrade" && typeof value === "number");
  const invalidStats = numericStats.filter(([, value]) => !Number.isFinite(value));
  if (invalidStats.length > 0) {
    console.error("[UPGRADE STATS ERROR] Non-finite player stat detected", invalidStats);
  }
}

UpgradeManager.prototype.getCardLayout = function(canvasW, canvasH) {
  return balttatoActualCardLayout.call(this, canvasW, canvasH);
};

const balttatoOriginalReadableGenerateOfferings = UpgradeManager.prototype.generateOfferings;
UpgradeManager.prototype.generateOfferings = function(forceJoker = false, player = null) {
  const cards = balttatoOriginalReadableGenerateOfferings.call(this, forceJoker, player);
  const statText = {
    chain_hits: "Stats: Chain Hits +1",
    multishot: "Stats: Multishot +1",
    overclock_speed: "Stats: Speed +25",
    ricochet: "Stats: Ricochet +1",
    explosive_rounds: "Stats: Blast Radius +15\nMax 85",
    nanite_siphon: "Stats: Life Leech Chance +15%",
    attack_speed: "Stats: Fire Rate +20%",
    heavy_ordnance: "Stats: Damage +12",
    piercing_rounds: "Stats: Penetration +1",
    vital_bulk: "Stats: Max Health +30\nHeal +40",
    energy_shield: "Stats: Armor +3",
    vacuum_funnel: "Stats: Magnet Radius +70",
    crit_overcharge: "Stats: Crit Chance +15%\nCrit Multiplier 2.5x",
    targeting_sensor: "Stats: Weapon Range +22% scaling",
    focal_array: "Stats: Damage +6\nWeapon Range +30% scaling",
    accelerator_coils: "Stats: Projectile Speed +20%",
    hypervelocity_cores: "Stats: Projectile Speed +35%\nRange +18% scaling",
    lucky_charm: "Stats: Luck +1",
    shrapnel_casing: "Stats: Fragmentation +2",
    cluster_munitions: "Stats: Fragmentation +3\nProjectile Speed +15%",
    boost_capacity: "Stats: Boost Capacity +50\nFully recharge Boost"
  };

  for (const card of cards) {
    if (!card.isJoker) {
      if (statText[card.id]) {
        card.description = statText[card.id];
      } else if (typeof card.description === "string" && card.description.includes("Stats:")) {
        card.description = card.description.replace(/\s*\|\s*/g, "\n");
      }
    }
  }

  return cards;
};

const balttatoOriginalApplyUpgrade = UpgradeManager.prototype.applyUpgrade;
UpgradeManager.prototype.applyUpgrade = function(index, player) {
  if (index >= 0 && index < this.activeCards.length) {
    const upgrade = this.activeCards[index];
    if (upgrade && upgrade.id === "attack_speed") {
      const currentRatePercent = Math.min(
        BALTTATO_MAX_FIRE_RATE_PERCENT,
        Math.max(
          100,
          Math.round(
            (BALTTATO_BASE_FIRE_INTERVAL / Math.max(BALTTATO_MIN_FIRE_INTERVAL, player.fireInterval)) * 100
          )
        )
      );
      player.fireRatePercent = Math.min(
        BALTTATO_MAX_FIRE_RATE_PERCENT,
        currentRatePercent + 20
      );
      player.fireInterval = Math.max(
        BALTTATO_MIN_FIRE_INTERVAL,
        BALTTATO_BASE_FIRE_INTERVAL * (100 / player.fireRatePercent)
      );
      if (!Number.isFinite(player.fireInterval)) {
        player.fireRatePercent = 100;
        player.fireInterval = BALTTATO_BASE_FIRE_INTERVAL;
      }
      logDebug(1, "Upgrade applied: RAPID CYCLER", {
        fireRatePercent: player.fireRatePercent,
        newInterval: player.fireInterval
      });
    } else {
      const applied = balttatoOriginalApplyUpgrade.call(this, index, player);
      if (!applied) return false;
      balttatoDumpPlayerStats(player, upgrade.title);
      return true;
    }

    if (!player.acquiredUpgrades) player.acquiredUpgrades = [];
    player.acquiredUpgrades.push(upgrade.title);
    balttatoDumpPlayerStats(player, upgrade.title);
    return true;
  }
  return false;
};

// The base GameManager hotkey handler only exposes keys 1-3. Add the fourth
// choice here without replacing the existing event binding or selection logic.
window.addEventListener("keydown", (e) => {
  if (e.key === "4" && window.__arenaGameInstance) {
    const game = window.__arenaGameInstance;
    if (game.state === "LEVEL_UP" && game.upgradeManager.activeCards.length >= 4) {
      game.selectUpgradeByIndex(3);
    }
  }
});

logDebug(1, "Readable upgrade card layout enabled", {
  cardWidth: BALTTATO_CARD_WIDTH,
  cardHeight: BALTTATO_CARD_HEIGHT,
  supportsFourCards: true
});
