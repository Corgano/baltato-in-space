/*
 * Card proportions, persistent upgrade checkpoints, and final projectile tuning.
 */

const BALTTATO_CARD_BASE_WIDTH = 69;
const BALTTATO_CARD_BASE_HEIGHT = 93;
const BALTTATO_CARD_WIDTH_16 = 180;
const BALTTATO_CARD_HEIGHT_16 = Math.round(
  BALTTATO_CARD_WIDTH_16 * BALTTATO_CARD_BASE_HEIGHT / BALTTATO_CARD_BASE_WIDTH
);
const BALTTATO_CARD_GAP_16 = 12;
const BALTTATO_SNAIL_MAIL_ACCELERATION = 650;
const BALTTATO_SNAIL_MAIL_MAX_SPEED = 1400;
const BALTTATO_FINAL_FRAGMENTATION_BASE = 0.18;
const BALTTATO_FINAL_FRAGMENTATION_CAP = 0.90;
const BALTTATO_FINAL_FRAGMENTATION_LUCK_RATE = 0.20;

function balttatoFinalFragmentChance(player) {
  const fragmentation = Math.max(0, Number(player && player.fragmentation) || 0);
  const luck = Math.max(0, Number(player && player.luck) || 0);
  if (fragmentation <= 0) return 0;

  const fragmentationCurve = 1 - Math.exp(-0.18 * fragmentation);
  const luckCurve = 1 - Math.exp(-BALTTATO_FINAL_FRAGMENTATION_LUCK_RATE * luck);
  const baseChance = BALTTATO_FINAL_FRAGMENTATION_BASE +
    (BALTTATO_FINAL_FRAGMENTATION_CAP - BALTTATO_FINAL_FRAGMENTATION_BASE) * fragmentationCurve;
  return Math.min(
    BALTTATO_FINAL_FRAGMENTATION_CAP,
    baseChance + (BALTTATO_FINAL_FRAGMENTATION_CAP - baseChance) * luckCurve
  );
}

const balttatoOriginalPenetrationFragmentChance = balttatoFragmentChance;
balttatoFragmentChance = function(player) {
  return balttatoOriginalPenetrationFragmentChance(player) / 3;
};

UpgradeManager.prototype.getCardLayout = function(canvasW, canvasH) {
  const cardW = BALTTATO_CARD_WIDTH_16;
  const cardH = BALTTATO_CARD_HEIGHT_16;
  const gap = BALTTATO_CARD_GAP_16;
  const cardCount = Math.max(1, this.activeCards.length);
  const totalW = cardW * cardCount + gap * (cardCount - 1);
  const startX = (canvasW - totalW) / 2;
  const startY = canvasH / 2 - 108;
  const rects = [];

  for (let i = 0; i < cardCount; i++) {
    rects.push({
      x: startX + i * (cardW + gap),
      y: startY,
      w: cardW,
      h: cardH
    });
  }

  return rects;
};

const balttatoOriginalDrawOverlayCardRatio = UpgradeManager.prototype.drawOverlay;
UpgradeManager.prototype.drawOverlay = function(ctx, canvasW, canvasH, playerLevel, burnInfo = null) {
  balttatoOriginalDrawOverlayCardRatio.call(this, ctx, canvasW, canvasH, playerLevel, burnInfo);

  const rects = this.getCardLayout(canvasW, canvasH);
  for (let i = 0; i < this.activeCards.length; i++) {
    const card = this.activeCards[i];
    if (!card.isJoker) continue;
    const r = rects[i];

    ctx.save();
    ctx.fillStyle = "#faf5ea";
    ctx.strokeStyle = "#e2d7c5";
    ctx.lineWidth = 1;
    ctx.fillRect(r.x + 6, r.y + 6, r.w - 12, 31);
    ctx.strokeRect(r.x + 6, r.y + 6, r.w - 12, 31);

    ctx.font = "bold 11px monospace";
    ctx.fillStyle = card.rarityColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("JOKER", r.x + 12, r.y + 17);

    ctx.save();
    ctx.translate(r.x + r.w - 12, r.y + 26);
    ctx.rotate(Math.PI);
    ctx.textAlign = "right";
    ctx.fillText("JOKER", 0, 0);
    ctx.restore();

    ctx.font = "bold 9px monospace";
    ctx.textAlign = "left";
    ctx.fillText(card.title.toUpperCase(), r.x + 12, r.y + 31);
    ctx.restore();
  }
};

function balttatoWritePersistentUpgradeCheckpoint(game, snapshot) {
  if (!game || !snapshot) return;

  try {
    const encoded = encodeURIComponent(JSON.stringify(snapshot));
    if (encoded.length > 3800) {
      logDebug(0, "Persistent upgrade checkpoint was too large to save", { size: encoded.length });
      return;
    }
    document.cookie = `${BALTTATO_RUN_STATE_COOKIE}=${encoded}; max-age=${BALTTATO_RUN_STATE_MAX_AGE}; path=/; SameSite=Lax`;
    logDebug(1, "Persistent upgrade checkpoint written", {
      level: snapshot.playerLevel,
      choices: snapshot.activeCards.length,
      size: encoded.length
    });
  } catch (err) {
    logDebug(0, "Unable to write persistent upgrade checkpoint", err);
  }
}

function balttatoCaptureUpgradeCheckpoint(game) {
  const player = game.player;
  return {
    player: {
      x: player.x,
      y: player.y,
      health: player.health,
      maxHealth: player.maxHealth,
      speed: player.speed,
      armor: player.armor,
      fireInterval: player.fireInterval,
      fireRatePercent: player.fireRatePercent,
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
      hasExplosiveBlast: player.hasExplosiveBlast,
      blastRadius: player.blastRadius,
      lifeLeechChance: player.lifeLeechChance,
      fragmentation: player.fragmentation,
      luck: player.luck,
      magnetRadius: player.magnetRadius,
      hasSnailMailJoker: player.hasSnailMailJoker,
      hasSuperpositionJoker: player.hasSuperpositionJoker,
      boostCapacity: player.boostCapacity,
      boost: player.boost,
      acquiredUpgrades: player.acquiredUpgrades,
      acquiredJokers: (player.acquiredJokers || []).map((joker) => joker.id)
    },
    playerLevel: game.playerLevel,
    currentXp: game.currentXp,
    xpThreshold: game.xpThreshold,
    totalScore: game.totalScore,
    totalKills: game.totalKills,
    rerollTokens: game.rerollTokens || 0,
    bossTier: game.bossTier,
    bossWarningTimer: game.bossWarningTimer,
    activeCards: game.upgradeManager.activeCards.map((card) => ({
      id: card.id,
      isJoker: !!card.isJoker
    }))
  };
}

const balttatoOriginalFinalizeCardSelectionCheckpoint = GameManager.prototype.finalizeCardSelection;
GameManager.prototype.finalizeCardSelection = function(index) {
  const checkpoint = this.state === "LEVEL_UP" ? balttatoCaptureUpgradeCheckpoint(this) : null;
  const result = balttatoOriginalFinalizeCardSelectionCheckpoint.call(this, index);

  if (checkpoint && result !== false) {
    if (this.state === "LEVEL_UP") {
      balttatoSetRunStateCookie(this);
    } else {
      balttatoWritePersistentUpgradeCheckpoint(this, checkpoint);
    }
  }

  return result;
};

const balttatoOriginalHandleAutoCombatProjectileTuning = GameManager.prototype.handleAutoCombat;
GameManager.prototype.handleAutoCombat = function(dt) {
  const projectileCountBefore = this.projectiles.length;
  balttatoOriginalHandleAutoCombatProjectileTuning.call(this, dt);

  for (let i = projectileCountBefore; i < this.projectiles.length; i++) {
    const projectile = this.projectiles[i];
    if (!projectile.hasSnailMail) continue;

    projectile.snailLaunchAngle = Math.atan2(projectile.vy, projectile.vx);
    projectile.vx = 0;
    projectile.vy = 0;
    projectile.snailAcc = BALTTATO_SNAIL_MAIL_ACCELERATION;
    projectile.snailMaxSpeed = BALTTATO_SNAIL_MAIL_MAX_SPEED;
  }
};

const balttatoOriginalProjectileUpdateTuning = Projectile.prototype.update;
Projectile.prototype.update = function(dt, arenaWidth = 800, arenaHeight = 600) {
  if (this.hasSnailMail && Math.hypot(this.vx, this.vy) <= 0.001 && Number.isFinite(this.snailLaunchAngle)) {
    const speed = Math.min(this.snailMaxSpeed || BALTTATO_SNAIL_MAIL_MAX_SPEED, (this.snailAcc || BALTTATO_SNAIL_MAIL_ACCELERATION) * dt);
    this.vx = Math.cos(this.snailLaunchAngle) * speed;
    this.vy = Math.sin(this.snailLaunchAngle) * speed;
  }
  const originalMaxRange = this.maxRange;
  this.maxRange = Infinity;
  try {
    return balttatoOriginalProjectileUpdateTuning.call(this, dt, arenaWidth, arenaHeight);
  } finally {
    this.maxRange = originalMaxRange;
  }
};

const balttatoOriginalSpawnFragmentsChance = GameManager.prototype.spawnFragments;
GameManager.prototype.spawnFragments = function(proj, hitDamage, impactSpeed) {
  const chance = balttatoFinalFragmentChance(this.player);
  if (Math.random() >= chance) {
    logDebug(3, "Final-impact fragmentation roll failed", {
      chance: chance.toFixed(3),
      luck: this.player.luck,
      fragmentation: this.player.fragmentation
    });
    return;
  }

  balttatoOriginalSpawnFragmentsChance.call(this, proj, hitDamage, impactSpeed);
  logDebug(3, "Final-impact fragmentation roll succeeded", {
    chance: chance.toFixed(3),
    luck: this.player.luck,
    fragmentation: this.player.fragmentation
  });
};

logDebug(1, "Card ratio, persistent upgrade checkpoint, Snail Mail launch, and Luck-scaled fragmentation tuning enabled", {
  cardRatio: `${BALTTATO_CARD_BASE_WIDTH}:${BALTTATO_CARD_BASE_HEIGHT}`,
  cardSize: `${BALTTATO_CARD_WIDTH_16}x${BALTTATO_CARD_HEIGHT_16}`
});
