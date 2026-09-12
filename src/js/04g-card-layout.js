/*
 * Compact level-up card presentation. The existing card renderer is kept intact;
 * this layer renders it into a proportional virtual canvas so the complete card
 * design, including Joker artwork, shrinks together without internal overlap.
 */

const BALTTATO_CARD_VIRTUAL_WIDTH = 960;
const BALTTATO_CARD_VIRTUAL_HEIGHT = 720;
const BALTTATO_CARD_WIDTH = 150;
const BALTTATO_CARD_HEIGHT = 175;
const BALTTATO_CARD_GAP = 10;
const BALTTATO_CARD_VIRTUAL_WIDTH_BASE = 180;
const BALTTATO_CARD_VIRTUAL_HEIGHT_BASE = 210;
const BALTTATO_CARD_VIRTUAL_GAP = 12;

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

function balttatoVirtualCardLayout(canvasW, canvasH) {
  const cardCount = Math.max(1, this.activeCards.length);
  const totalW = BALTTATO_CARD_VIRTUAL_WIDTH_BASE * cardCount + BALTTATO_CARD_VIRTUAL_GAP * (cardCount - 1);
  const startX = (canvasW - totalW) / 2;
  const startY = canvasH / 2 - 75;
  const rects = [];

  for (let i = 0; i < cardCount; i++) {
    rects.push({
      x: startX + i * (BALTTATO_CARD_VIRTUAL_WIDTH_BASE + BALTTATO_CARD_VIRTUAL_GAP),
      y: startY,
      w: BALTTATO_CARD_VIRTUAL_WIDTH_BASE,
      h: BALTTATO_CARD_VIRTUAL_HEIGHT_BASE
    });
  }

  return rects;
}

UpgradeManager.prototype.getCardLayout = function(canvasW, canvasH) {
  return balttatoActualCardLayout.call(this, canvasW, canvasH);
};

const balttatoOriginalCompactGenerateOfferings = UpgradeManager.prototype.generateOfferings;
UpgradeManager.prototype.generateOfferings = function(forceJoker = false) {
  const cards = balttatoOriginalCompactGenerateOfferings.call(this, forceJoker);
  const statText = {
    chain_hits: "Chain Hits +1",
    multishot: "Multishot +1",
    overclock_speed: "Speed +25",
    ricochet: "Ricochet +1",
    explosive_rounds: "Blast Radius +15",
    nanite_siphon: "Life Leech Chance +15%",
    attack_speed: "Fire Interval -18%",
    heavy_ordnance: "Damage +12",
    piercing_rounds: "Pierce +1",
    vital_bulk: "Max Health +30 | Heal +40",
    energy_shield: "Armor +3",
    vacuum_funnel: "Magnet Radius +70",
    crit_overcharge: "Crit Chance +15% | Crit Multiplier 2.5x",
    targeting_sensor: "Weapon Range +22% scaling",
    focal_array: "Damage +6 | Weapon Range +30% scaling",
    accelerator_coils: "Projectile Speed +20%",
    hypervelocity_cores: "Projectile Speed +35% | Range +18% scaling",
    lucky_charm: "Luck +1",
    shrapnel_casing: "Fragmentation +2",
    cluster_munitions: "Fragmentation +3 | Projectile Speed +15%"
  };

  for (const card of cards) {
    if (!card.isJoker && statText[card.id]) {
      card.description = statText[card.id];
    }
  }

  return cards;
};

const balttatoOriginalCompactDrawOverlay = UpgradeManager.prototype.drawOverlay;
UpgradeManager.prototype.drawOverlay = function(ctx, canvasW, canvasH, playerLevel, burnInfo = null) {
  const scaleX = canvasW / BALTTATO_CARD_VIRTUAL_WIDTH;
  const scaleY = canvasH / BALTTATO_CARD_VIRTUAL_HEIGHT;
  const originalLayout = this.getCardLayout;

  ctx.save();
  ctx.scale(scaleX, scaleY);
  this.getCardLayout = balttatoVirtualCardLayout;
  try {
    balttatoOriginalCompactDrawOverlay.call(
      this,
      ctx,
      BALTTATO_CARD_VIRTUAL_WIDTH,
      BALTTATO_CARD_VIRTUAL_HEIGHT,
      playerLevel,
      burnInfo
    );
  } finally {
    this.getCardLayout = originalLayout;
    ctx.restore();
  }
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

logDebug(1, "Compact upgrade card layout enabled", {
  cardWidth: BALTTATO_CARD_WIDTH,
  cardHeight: BALTTATO_CARD_HEIGHT,
  supportsFourCards: true
});
