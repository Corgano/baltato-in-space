/*
 * Infinite upgrade scaling and stat-first card presentation.
 * Keeps upgrade behavior data-driven so soft caps never make a repeat upgrade
 * worthless. Scaling details remain available through the pause stat panel.
 */

const BALTTATO_UPGRADE_SCALING = {
  chain_hits: {
    effects: [{ stat: "Chain Lightning", key: "chainHits", mode: "linear", amount: 1, minimum: 1, hardCap: 12 }],
    tooltip: "Chain Lightning ranks increase without a gameplay-breaking runaway count. The active chain count is safely capped at 12 targets."
  },
  multishot: {
    effects: [{ stat: "Multishot", key: "multishotCount", mode: "linear", amount: 1, minimum: 1, hardCap: 24 }],
    tooltip: "Multishot continues to rank up, while a 24-shot active-volley ceiling prevents projectile-count runaway."
  },
  overclock_speed: {
    effects: [{ stat: "Movement", key: "speed", mode: "linear", amount: 25, minimum: 1 }],
    tooltip: "Movement speed increases linearly without a hard cap."
  },
  ricochet: {
    effects: [{ stat: "Ricochet", key: "ricochetCount", mode: "linear", amount: 1, minimum: 1, hardCap: 20 }],
    tooltip: "Ricochet ranks continue increasing, with 20 active bounces as the safe gameplay ceiling."
  },
  explosive_rounds: {
    effects: [{ stat: "Blast Radius", key: "blastRadius", mode: "linear", amount: 15, minimum: 1, hardCap: 500 }],
    tooltip: "Blast radius increases linearly. Active blast size is limited to 500px to prevent excessive collision work."
  },
  nanite_siphon: {
    effects: [
      { stat: "Life Leech", key: "lifeLeechChance", mode: "curve", base: 0.15, cap: 0.85, rate: 0.62, minimum: 0.005 },
      { stat: "Siphon Amount", key: "lifeLeechAmount", mode: "linear", amount: 1, minimum: 1 }
    ],
    tooltip: "Chance follows a diminishing-returns curve toward 85%. Every rank also adds 1 hull to the siphoned amount, so later ranks remain useful."
  },
  attack_speed: {
    effects: [{ stat: "Fire Rate", key: "fireInterval", mode: "multiplicative", multiplier: 0.82, minimum: 0.08, hardCap: 0.08 }],
    tooltip: "Fire interval decreases multiplicatively toward a safe 0.08 second floor."
  },
  heavy_ordnance: {
    effects: [{ stat: "Damage", key: "damage", mode: "linear", amount: 12, minimum: 1 }],
    tooltip: "Projectile damage increases linearly without a gameplay hard cap."
  },
  piercing_rounds: {
    effects: [{ stat: "Penetration", key: "pierceCount", mode: "linear", amount: 1, minimum: 1, hardCap: 16 }],
    tooltip: "Penetration ranks continue increasing, with 16 active penetrations as the safe collision ceiling."
  },
  vital_bulk: {
    effects: [{ stat: "Max Hull", key: "maxHealth", mode: "linear", amount: 30, minimum: 1 }],
    tooltip: "Maximum hull increases linearly; the immediate repair remains +40 hull."
  },
  energy_shield: {
    effects: [{ stat: "Armor", key: "armor", mode: "linear", amount: 3, minimum: 1 }],
    tooltip: "Armor increases linearly without a gameplay hard cap."
  },
  vacuum_funnel: {
    effects: [{ stat: "Pickup Radius", key: "magnetRadius", mode: "linear", amount: 70, minimum: 1, hardCap: 1600 }],
    tooltip: "Pickup radius increases linearly, with a 1600px active-radius ceiling to keep pickup scans bounded."
  },
  crit_overcharge: {
    effects: [
      { stat: "Critical Chance", key: "critChance", mode: "curve", base: 0.15, cap: 0.95, rate: 0.62, minimum: 0.005 },
      { stat: "Critical Multiplier", key: "critMultiplier", mode: "linear", amount: 0.1, minimum: 0.01 }
    ],
    tooltip: "Critical chance approaches 95% with diminishing returns; critical multiplier continues increasing linearly."
  },
  targeting_sensor: {
    effects: [{ stat: "Range", key: "weaponRange", mode: "curve", base: 260, cap: 1200, rate: 0.18, minimum: 6, hardCap: 1200 }],
    tooltip: "Targeting range approaches 1200px with diminishing returns."
  },
  focal_array: {
    effects: [
      { stat: "Damage", key: "damage", mode: "linear", amount: 6, minimum: 1 },
      { stat: "Range", key: "weaponRange", mode: "curve", base: 260, cap: 1200, rate: 0.18, minimum: 8, hardCap: 1200 }
    ],
    tooltip: "Damage keeps scaling linearly while targeting range approaches a 1200px soft cap."
  },
  accelerator_coils: {
    effects: [{ stat: "Projectile Speed", key: "projectileSpeed", mode: "multiplicative", multiplier: 1.20, minimum: 20, hardCap: 5000 }],
    tooltip: "Projectile speed scales multiplicatively toward a safe 5000px/s active ceiling."
  },
  hypervelocity_cores: {
    effects: [
      { stat: "Projectile Speed", key: "projectileSpeed", mode: "multiplicative", multiplier: 1.35, minimum: 20, hardCap: 5000 },
      { stat: "Range", key: "weaponRange", mode: "curve", base: 260, cap: 1200, rate: 0.18, minimum: 6, hardCap: 1200 }
    ],
    tooltip: "Projectile speed scales multiplicatively toward 5000px/s; range approaches 1200px."
  },
  lucky_charm: {
    effects: [{ stat: "Luck", key: "luck", mode: "linear", amount: 1, minimum: 1 }],
    tooltip: "Luck increases linearly and feeds the game's diminishing-return rare-event curves."
  },
  shrapnel_casing: {
    effects: [{ stat: "Fragmentation", key: "fragmentation", mode: "linear", amount: 2, minimum: 1, hardCap: 12 }],
    tooltip: "Fragmentation ranks continue increasing, with 12 active shards per source as the safe gameplay ceiling."
  },
  cluster_munitions: {
    effects: [
      { stat: "Fragmentation", key: "fragmentation", mode: "linear", amount: 3, minimum: 1, hardCap: 12 },
      { stat: "Projectile Speed", key: "projectileSpeed", mode: "multiplicative", multiplier: 1.15, minimum: 10, hardCap: 5000 }
    ],
    tooltip: "Fragmentation continues ranking with a 12-shard active ceiling; projectile speed approaches 5000px/s."
  },
  boost_capacity: {
    effects: [{ stat: "Boost Capacity", key: "boostCapacity", mode: "linear", amount: 50, minimum: 1 }],
    tooltip: "Boost capacity increases linearly without a gameplay hard cap."
  }
};

function balttatoUpgradeCurve(start, cap, rate, rank) {
  const safeRank = Math.max(0, Number(rank) || 0);
  const safeStart = Number(start) || 0;
  const safeCap = Number(cap);
  if (!Number.isFinite(safeCap) || safeCap <= safeStart) return safeStart;
  return safeStart + (safeCap - safeStart) * (1 - Math.exp(-Math.max(0, rate) * safeRank));
}

function balttatoUpgradeRank(player, id) {
  const titleMap = {
    chain_hits: "CHAIN LIGHTNING",
    multishot: "SPREAD VOLLEY",
    overclock_speed: "AGILITY THRUSTERS",
    ricochet: "KINETIC RICOCHET",
    explosive_rounds: "PLASMA WARHEAD",
    nanite_siphon: "NANITE SIPHON",
    attack_speed: "RAPID CYCLER",
    heavy_ordnance: "HEAVY ORDNANCE",
    piercing_rounds: "RAILGUN CASING",
    vital_bulk: "TITANIUM PLATING",
    energy_shield: "REACTIVE ARMOR",
    vacuum_funnel: "MAGNETIC VORTEX",
    crit_overcharge: "OPTICAL AMPLIFIER",
    targeting_sensor: "TARGETING SENSOR",
    focal_array: "FOCAL ARRAY",
    accelerator_coils: "ACCELERATOR COILS",
    hypervelocity_cores: "HYPERVELOCITY CORES",
    lucky_charm: "LUCKY CHARM",
    shrapnel_casing: "SHRAPNEL CASING",
    cluster_munitions: "CLUSTER MUNITIONS",
    boost_capacity: "BOOST CAPACITY"
  };
  const title = titleMap[id];
  if (!title || !player.acquiredUpgrades) return 0;
  return player.acquiredUpgrades.filter((value) => value === title).length;
}

function balttatoSafeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function balttatoClampStat(player, key, minimum = 0, maximum = Infinity) {
  player[key] = Math.min(maximum, Math.max(minimum, balttatoSafeNumber(player[key], minimum)));
  return player[key];
}

function balttatoApplyConfiguredUpgrade(player, upgrade) {
  const config = BALTTATO_UPGRADE_SCALING[upgrade.id];
  if (!config) return false;

  const rank = balttatoUpgradeRank(player, upgrade.id) + 1;
  for (let i = 0; i < config.effects.length; i++) {
    const effect = config.effects[i];
    const current = balttatoSafeNumber(player[effect.key], 0);
    let next = current;

    if (effect.key === "lifeLeechChance") {
      next = balttatoUpgradeCurve(0, effect.cap, effect.rate, rank);
    } else if (effect.key === "critChance") {
      next = balttatoUpgradeCurve(0.08, effect.cap, effect.rate, rank);
    } else if (effect.key === "weaponRange") {
      const base = effect.base;
      const currentRankValue = balttatoUpgradeCurve(base, effect.cap, effect.rate, rank);
      next = Math.max(current + effect.minimum, currentRankValue);
    } else if (effect.mode === "multiplicative") {
      next = current * effect.multiplier;
    } else if (effect.mode === "linear") {
      next = current + effect.amount;
    }

    if (effect.hardCap !== undefined) next = Math.min(effect.hardCap, next);
    if (effect.minimum !== undefined && effect.mode !== "curve") {
      if (effect.key === "fireInterval") next = Math.max(effect.minimum, next);
      else if (effect.mode === "multiplicative") next = Math.max(effect.minimum, next);
    }
    if (!Number.isFinite(next)) next = current;
    player[effect.key] = next;
  }

  if (upgrade.id === "nanite_siphon") {
    player.lifeLeechAmount = Math.max(9, 8 + rank);
  }

  if (upgrade.id === "explosive_rounds") player.hasExplosiveBlast = true;
  if (upgrade.id === "crit_overcharge") player.critMultiplier = Math.max(2.0, 2.0 + rank * 0.1);
  return true;
}

function balttatoFormatUpgradeStats(upgrade) {
  const config = BALTTATO_UPGRADE_SCALING[upgrade.id];
  if (!config) return upgrade.statEffects && upgrade.statEffects.length > 0 ? upgrade.statEffects.join(" | ") : "";
  return config.effects.map((effect) => {
    if (effect.key === "lifeLeechChance") return `${effect.stat} +${Math.round(effect.base * 100)}%`;
    if (effect.key === "lifeLeechAmount") return `${effect.stat} +${effect.amount}`;
    if (effect.mode === "multiplicative") return `${effect.stat} x${effect.multiplier.toFixed(2)}`;
    return `${effect.stat} +${effect.amount || effect.minimum || 0}`;
  }).join(" | ");
}

function balttatoInstallInfiniteUpgradeScaling() {
  const originalConstructor = UpgradeManager;
  UpgradeManager = class extends originalConstructor {
    constructor() {
      super();
      for (let i = 0; i < this.upgradeCatalog.length; i++) {
        const upgrade = this.upgradeCatalog[i];
        const config = BALTTATO_UPGRADE_SCALING[upgrade.id];
        if (!config) continue;
        upgrade.scaling = config;
        upgrade.statEffects = config.effects.map((effect) => {
          if (effect.mode === "multiplicative") return `${effect.stat} x${effect.multiplier.toFixed(2)}`;
          if (effect.key === "lifeLeechChance") return `${effect.stat} +15%`;
          return `${effect.stat} +${effect.amount || effect.minimum || 0}`;
        });

        const originalApply = upgrade.apply;
        upgrade.apply = (player) => {
          if (balttatoApplyConfiguredUpgrade(player, upgrade)) {
            logDebug(1, `Infinite scaling upgrade applied: ${upgrade.title}`, {
              rank: balttatoUpgradeRank(player, upgrade.id),
              effects: config.effects.map((effect) => ({ stat: effect.stat, value: player[effect.key] }))
            });
            return;
          }
          originalApply(player);
        };
      }
    }
  };

  logDebug(1, "Infinite upgrade scaling framework enabled", {
    configuredUpgrades: Object.keys(BALTTATO_UPGRADE_SCALING).length
  });
}

balttatoInstallInfiniteUpgradeScaling();

window.BALTTATO_UPGRADE_SCALING = BALTTATO_UPGRADE_SCALING;

// Keep upgrade cards focused on the stat delta. Detailed scaling rules belong
// in the pause-screen stat tooltip instead of the card face.
const balttatoOriginalInfiniteDrawOverlay = UpgradeManager.prototype.drawOverlay;
UpgradeManager.prototype.drawOverlay = function(ctx, canvasW, canvasH, playerLevel, burnInfo = null) {
  const descriptions = [];
  for (let i = 0; i < this.activeCards.length; i++) {
    const card = this.activeCards[i];
    descriptions.push(card.description);
    if (!card.isJoker) card.description = balttatoFormatUpgradeStats(card);
  }
  try {
    balttatoOriginalInfiniteDrawOverlay.call(this, ctx, canvasW, canvasH, playerLevel, burnInfo);
  } finally {
    for (let i = 0; i < this.activeCards.length && i < descriptions.length; i++) {
      this.activeCards[i].description = descriptions[i];
    }
  }
};

// Keep the active gameplay representation bounded even though the underlying
// stats remain available for the pause screen. This is deliberately centralized
// so every high-cardinality stat gets the same safety treatment.
function balttatoApplyRuntimeSafety(player) {
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
    fireInterval: 0.08
  };
  for (const key of Object.keys(limits)) {
    const value = balttatoSafeNumber(player[key], 0);
    if (key === "fireInterval") player[key] = Math.max(limits[key], value);
    else player[key] = Math.min(limits[key], Math.max(0, value));
  }
}

const balttatoOriginalHandleAutoCombatInfiniteSafety = GameManager.prototype.handleAutoCombat;
GameManager.prototype.handleAutoCombat = function(dt) {
  balttatoApplyRuntimeSafety(this.player);
  balttatoOriginalHandleAutoCombatInfiniteSafety.call(this, dt);
};

const balttatoOriginalCheckCollisionsInfiniteSafety = GameManager.prototype.checkCollisions;
GameManager.prototype.checkCollisions = function() {
  balttatoApplyRuntimeSafety(this.player);
  balttatoOriginalCheckCollisionsInfiniteSafety.call(this);
};

const balttatoOriginalUpdateEntitiesInfiniteSafety = GameManager.prototype.updateEntities;
GameManager.prototype.updateEntities = function(dt) {
  balttatoApplyRuntimeSafety(this.player);
  balttatoOriginalUpdateEntitiesInfiniteSafety.call(this, dt);
};

const balttatoOriginalFinalizeCardSelectionInfiniteSafety = GameManager.prototype.finalizeCardSelection;
GameManager.prototype.finalizeCardSelection = function(index) {
  balttatoOriginalFinalizeCardSelectionInfiniteSafety.call(this, index);
  balttatoApplyRuntimeSafety(this.player);
};

// Fragmentation and chain effects can multiply entities. Keep their probability
// curves intact but bound the number of live visual effects so high Luck/rank
// combinations cannot consume the browser event loop.
const balttatoOriginalCreateChainExplosionInfiniteSafety = balttatoCreateChainExplosion;
balttatoCreateChainExplosion = function(game, x, y, damage, depth) {
  if (depth > 5) return;
  if (game.blastEffects.length >= 48) return;
  balttatoOriginalCreateChainExplosionInfiniteSafety(game, x, y, damage, depth);
};

const balttatoOriginalProcessBlastWaveInfiniteSafety = balttatoProcessBlastWave;
balttatoProcessBlastWave = function(game, blast, dt) {
  if (!blast || blast.isDestroyed) return;
  balttatoOriginalProcessBlastWaveInfiniteSafety(game, blast, dt);
};

logDebug(1, "Infinite upgrade safety layer active", {
  multishotActiveCap: 24,
  fragmentationActiveCap: 12,
  chainActiveCap: 12,
  projectileSpeedActiveCap: 5000,
  blastRadiusActiveCap: 500,
  chainExplosionDepthCap: 5
});
