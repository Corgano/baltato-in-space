/*
 * Infinite upgrade scaling and stat-first card presentation.
 * Keeps upgrade behavior data-driven so soft caps never make a repeat upgrade
 * worthless. Scaling details remain available through the pause stat panel.
 */

const BALTTATO_UPGRADE_SCALING = {
  nanite_siphon: {
    effects: [
      {
        stat: "Life Leech",
        key: "lifeLeechChance",
        mode: "exponential",
        base: 0.15,
        cap: 0.85,
        rate: 0.62,
        minimum: 0.005
      },
      {
        stat: "Siphon Amount",
        key: "lifeLeechAmount",
        mode: "linear",
        amount: 1,
        minimum: 1
      }
    ],
    tooltip: "Chance follows a diminishing-returns curve toward 85%. Each rank also adds 1 hull to the siphoned amount, so ranks remain useful after the chance approaches its cap."
  },
  explosive_rounds: {
    effects: [{ stat: "Blast Radius", key: "blastRadius", mode: "linear", amount: 15, minimum: 1 }],
    tooltip: "Blast radius increases linearly without a hard cap."
  },
  attack_speed: {
    effects: [{ stat: "Fire Rate", key: "fireInterval", mode: "exponential", multiplier: 0.82, minimum: 0.005 }],
    tooltip: "Each rank reduces the interval multiplicatively. A minimum interval is retained only as a numerical safety floor."
  },
  crit_overcharge: {
    effects: [
      { stat: "Critical Chance", key: "critChance", mode: "exponential", base: 0.15, cap: 0.95, rate: 0.62, minimum: 0.005 },
      { stat: "Critical Multiplier", key: "critMultiplier", mode: "linear", amount: 0.1, minimum: 0.01 }
    ],
    tooltip: "Critical chance uses diminishing returns toward 95%; multiplier continues increasing linearly."
  },
  targeting_sensor: {
    effects: [{ stat: "Range", key: "weaponRange", mode: "linear", amount: 14, minimum: 1 }],
    tooltip: "Range no longer hard-caps; each rank adds a fixed minimum amount."
  },
  focal_array: {
    effects: [
      { stat: "Damage", key: "damage", mode: "linear", amount: 6, minimum: 1 },
      { stat: "Range", key: "weaponRange", mode: "linear", amount: 18, minimum: 1 }
    ],
    tooltip: "Both damage and range continue increasing linearly."
  },
  hypervelocity_cores: {
    effects: [
      { stat: "Projectile Speed", key: "projectileSpeed", mode: "exponential", multiplier: 1.35, minimum: 1 },
      { stat: "Range", key: "weaponRange", mode: "linear", amount: 12, minimum: 1 }
    ],
    tooltip: "Projectile speed scales multiplicatively; range retains a fixed minimum gain."
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
    nanite_siphon: "NANITE SIPHON",
    explosive_rounds: "PLASMA WARHEAD",
    attack_speed: "RAPID CYCLER",
    crit_overcharge: "OPTICAL AMPLIFIER",
    targeting_sensor: "TARGETING SENSOR",
    focal_array: "FOCAL ARRAY",
    hypervelocity_cores: "HYPERVELOCITY CORES"
  };
  const title = titleMap[id];
  if (!title || !player.acquiredUpgrades) return 0;
  return player.acquiredUpgrades.filter((value) => value === title).length;
}

function balttatoApplyInfiniteNanite(player) {
  const rank = balttatoUpgradeRank(player, "nanite_siphon") + 1;
  player.lifeLeechChance = Math.min(0.85, balttatoUpgradeCurve(0, 0.85, 0.62, rank));
  player.lifeLeechAmount = Math.max(9, 8 + rank);
}

function balttatoInstallInfiniteUpgradeScaling() {
  const originalConstructor = UpgradeManager;
  UpgradeManager = class extends originalConstructor {
    constructor() {
      super();
      const catalog = this.upgradeCatalog;
      for (let i = 0; i < catalog.length; i++) {
        const upgrade = catalog[i];
        const config = BALTTATO_UPGRADE_SCALING[upgrade.id];
        if (!config) continue;

        upgrade.scaling = config;
        const originalApply = upgrade.apply;
        upgrade.apply = (player) => {
          if (upgrade.id === "nanite_siphon") {
            balttatoApplyInfiniteNanite(player);
            return;
          }
          originalApply(player);
        };
      }
    }
  };

  logDebug(1, "Infinite upgrade scaling framework enabled", {
    configuredUpgrades: Object.keys(BALTTATO_UPGRADE_SCALING)
  });
}

balttatoInstallInfiniteUpgradeScaling();

// The existing card layer reads this function when it appends stat text. Keep
// the card face concise: the affected stat and its current-rank gain belong on
// the card; scaling rules belong in the pause-screen stat tooltip.
balttatoFormatUpgradeStats = function(upgrade) {
  const config = BALTTATO_UPGRADE_SCALING[upgrade.id];
  if (!config) return upgrade.statEffects && upgrade.statEffects.length > 0 ? upgrade.statEffects.join(" | ") : "";
  return config.effects.map((effect) => {
    if (effect.key === "lifeLeechChance") return `${effect.stat} +${Math.round(effect.base * 100)}%`;
    if (effect.key === "lifeLeechAmount") return `${effect.stat} +${effect.amount}`;
    if (effect.mode === "exponential" && effect.multiplier) return `${effect.stat} x${effect.multiplier.toFixed(2)}`;
    return `${effect.stat} +${effect.amount || 0}`;
  }).join(" | ");
};

// Expose the scaling rules to the pause screen without changing the existing
// stat table structure. Hover text can be expanded by the stat presentation
// layer without putting implementation details onto upgrade cards.
window.BALTTATO_UPGRADE_SCALING = BALTTATO_UPGRADE_SCALING;

logDebug(1, "Nanite Siphon now scales beyond five ranks", {
  probabilityCap: 0.85,
  minimumSiphonAmount: 9,
  amountGrowthPerRank: 1
});
