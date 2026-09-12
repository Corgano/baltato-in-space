/*
 * Compact level-up card presentation. The existing card renderer is kept intact;
 * this layer keeps the complete card design at a readable size while ensuring
 * four choices fit within the 800x600 game viewport.
 */

const BALTTATO_CARD_WIDTH = 180;
const BALTTATO_CARD_HEIGHT = 210;
const BALTTATO_CARD_GAP = 12;

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

UpgradeManager.prototype.getCardLayout = function(canvasW, canvasH) {
  return balttatoActualCardLayout.call(this, canvasW, canvasH);
};

const balttatoOriginalReadableGenerateOfferings = UpgradeManager.prototype.generateOfferings;
UpgradeManager.prototype.generateOfferings = function(forceJoker = false) {
  const cards = balttatoOriginalReadableGenerateOfferings.call(this, forceJoker);
  const statText = {
    chain_hits: "Stats: Chain Hits +1",
    multishot: "Stats: Multishot +1",
    overclock_speed: "Stats: Speed +25",
    ricochet: "Stats: Ricochet +1",
    explosive_rounds: "Stats: Blast Radius +15 | Max 85",
    nanite_siphon: "Stats: Life Leech Chance +15%",
    attack_speed: "Stats: Fire Interval -18%",
    heavy_ordnance: "Stats: Damage +12",
    piercing_rounds: "Stats: Penetration +1",
    vital_bulk: "Stats: Max Health +30 | Heal +40",
    energy_shield: "Stats: Armor +3",
    vacuum_funnel: "Stats: Magnet Radius +70",
    crit_overcharge: "Stats: Crit Chance +15% | Crit Multiplier 2.5x",
    targeting_sensor: "Stats: Weapon Range +22% scaling",
    focal_array: "Stats: Damage +6 | Weapon Range +30% scaling",
    accelerator_coils: "Stats: Projectile Speed +20%",
    hypervelocity_cores: "Stats: Projectile Speed +35% | Range +18% scaling",
    lucky_charm: "Stats: Luck +1",
    shrapnel_casing: "Stats: Fragmentation +2",
    cluster_munitions: "Stats: Fragmentation +3 | Projectile Speed +15%"
  };

  for (const card of cards) {
    if (!card.isJoker && statText[card.id]) {
      card.description = statText[card.id];
    }
  }

  return cards;
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
