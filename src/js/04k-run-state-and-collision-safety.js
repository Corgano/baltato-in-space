/*
 * Run-state persistence and collision safety. The upgrade screen is the only
 * point where a run is persisted: refreshing the page returns to the exact
 * upgrade choices and player progression that were present at that screen.
 */

const BALTTATO_RUN_STATE_COOKIE = "balttato_run_state";
const BALTTATO_RUN_STATE_MAX_AGE = 60 * 60 * 24 * 7;
const BALTTATO_SUPERPOSITION_INITIAL_OFFSET = 7.5;
const BALTTATO_SUPERPOSITION_SPREAD_SPEED = 18;
const BALTTATO_SUPERPOSITION_COLOR = "#60a5fa";

function balttatoExtraChoiceChance(player) {
  const luck = Math.max(0, Number(player && player.luck) || 0);
  const extraChoiceCap = 0.50;
  const extraChoiceLuckCurve = 0.20;
  return Math.min(
    extraChoiceCap,
    extraChoiceCap * (1 - Math.exp(-extraChoiceLuckCurve * luck))
  );
}

function balttatoSetRunStateCookie(game) {
  if (!game || game.state !== "LEVEL_UP") return;

  const player = game.player;
  const snapshot = {
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

  try {
    const encoded = encodeURIComponent(JSON.stringify(snapshot));
    if (encoded.length > 3800) {
      logDebug(0, "Upgrade-state cookie was too large to save", { size: encoded.length });
      return;
    }

    document.cookie = `${BALTTATO_RUN_STATE_COOKIE}=${encoded}; max-age=${BALTTATO_RUN_STATE_MAX_AGE}; path=/; SameSite=Lax`;
    logDebug(1, "Upgrade-state checkpoint saved", {
      level: game.playerLevel,
      choices: game.upgradeManager.activeCards.length,
      size: encoded.length
    });
  } catch (err) {
    logDebug(0, "Unable to save upgrade-state checkpoint", err);
  }
}

function balttatoGetRunStateCookie() {
  const prefix = `${BALTTATO_RUN_STATE_COOKIE}=`;
  const cookies = document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(prefix)) {
      try {
        return JSON.parse(decodeURIComponent(cookie.slice(prefix.length)));
      } catch (err) {
        logDebug(0, "Saved upgrade-state cookie was invalid and will be cleared", err);
        balttatoClearRunStateCookie();
        return null;
      }
    }
  }

  return null;
}

function balttatoClearRunStateCookie() {
  document.cookie = `${BALTTATO_RUN_STATE_COOKIE}=; max-age=0; path=/; SameSite=Lax`;
}

function balttatoRestoreRunState(game) {
  const snapshot = balttatoGetRunStateCookie();
  if (!snapshot || !snapshot.player || !Array.isArray(snapshot.activeCards)) return;

  try {
    Object.assign(game.player, snapshot.player);

    const restoredJokers = [];
    const savedJokers = Array.isArray(snapshot.player.acquiredJokers) ? snapshot.player.acquiredJokers : [];
    for (let i = 0; i < savedJokers.length; i++) {
      const jokerId = savedJokers[i];
      const joker = game.upgradeManager.jokerCatalog.find((card) => card.id === jokerId);
      if (joker) restoredJokers.push({ ...joker });
    }
    game.player.acquiredJokers = restoredJokers;

    const restoredCards = [];
    for (let i = 0; i < snapshot.activeCards.length; i++) {
      const savedCard = snapshot.activeCards[i];
      const catalog = savedCard.isJoker ? game.upgradeManager.jokerCatalog : game.upgradeManager.upgradeCatalog;
      const card = catalog.find((entry) => entry.id === savedCard.id);
      if (card) restoredCards.push({ ...card });
    }
    if (restoredCards.length !== snapshot.activeCards.length) {
      throw new Error("One or more saved upgrade cards could not be restored");
    }

    game.playerLevel = Number.isFinite(snapshot.playerLevel) ? snapshot.playerLevel : game.playerLevel;
    game.currentXp = Number.isFinite(snapshot.currentXp) ? snapshot.currentXp : game.currentXp;
    game.xpThreshold = Number.isFinite(snapshot.xpThreshold) ? snapshot.xpThreshold : game.xpThreshold;
    game.totalScore = Number.isFinite(snapshot.totalScore) ? snapshot.totalScore : game.totalScore;
    game.totalKills = Number.isFinite(snapshot.totalKills) ? snapshot.totalKills : game.totalKills;
    game.rerollTokens = Number.isFinite(snapshot.rerollTokens) ? snapshot.rerollTokens : 0;
    game.bossTier = Number.isFinite(snapshot.bossTier) ? snapshot.bossTier : game.bossTier;
    game.bossWarningTimer = Number.isFinite(snapshot.bossWarningTimer) ? snapshot.bossWarningTimer : 0;
    game.upgradeManager.activeCards = restoredCards;
    game.upgradeManager.hoveredCardIndex = -1;
    game.cardBurn = { active: false, cardIndex: -1, progress: 0, embers: [], pendingCard: null };
    game.state = "LEVEL_UP";
    game.lastTimestamp = performance.now();
    if (typeof game.updateHUD === "function") game.updateHUD();
    if (typeof balttatoRefreshJokerRack === "function") balttatoRefreshJokerRack(game);

    logDebug(1, "Upgrade-state checkpoint restored after page load", {
      level: game.playerLevel,
      choices: game.upgradeManager.activeCards.length
    });
  } catch (err) {
    balttatoClearRunStateCookie();
    logDebug(0, "Unable to restore upgrade-state checkpoint; starting a new run", err);
  }
}

const balttatoOriginalInitRunState = GameManager.prototype.init;
GameManager.prototype.init = function() {
  balttatoOriginalInitRunState.call(this);
  balttatoRestoreRunState(this);
};

const balttatoOriginalTriggerLevelUpRunState = GameManager.prototype.triggerLevelUp;
GameManager.prototype.triggerLevelUp = function() {
  balttatoOriginalTriggerLevelUpRunState.call(this);
  balttatoSetRunStateCookie(this);
};

const balttatoOriginalRerollOfferingsRunState = GameManager.prototype.rerollOfferings;
GameManager.prototype.rerollOfferings = function() {
  const result = balttatoOriginalRerollOfferingsRunState.call(this);
  if (result) balttatoSetRunStateCookie(this);
  return result;
};

const balttatoOriginalFinalizeCardSelectionRunState = GameManager.prototype.finalizeCardSelection;
GameManager.prototype.finalizeCardSelection = function(index) {
  const result = balttatoOriginalFinalizeCardSelectionRunState.call(this, index);
  balttatoClearRunStateCookie();
  return result;
};

const balttatoOriginalTriggerGameOverRunState = GameManager.prototype.triggerGameOver;
GameManager.prototype.triggerGameOver = function() {
  balttatoClearRunStateCookie();
  return balttatoOriginalTriggerGameOverRunState.call(this);
};

const balttatoOriginalRestartGameRunState = GameManager.prototype.restartGame;
GameManager.prototype.restartGame = function() {
  balttatoClearRunStateCookie();
  return balttatoOriginalRestartGameRunState.call(this);
};

const balttatoOriginalHandleAutoCombatRunState = GameManager.prototype.handleAutoCombat;
GameManager.prototype.handleAutoCombat = function(dt) {
  const projectileCountBefore = this.projectiles.length;
  balttatoOriginalHandleAutoCombatRunState.call(this, dt);

  if (!this.player.hasSuperpositionJoker) return;

  const newProjectiles = this.projectiles.slice(projectileCountBefore);
  const pairs = new Map();
  for (let i = 0; i < newProjectiles.length; i++) {
    const projectile = newProjectiles[i];
    if (!projectile.superpositionPairId) continue;
    if (!pairs.has(projectile.superpositionPairId)) pairs.set(projectile.superpositionPairId, []);
    pairs.get(projectile.superpositionPairId).push(projectile);
  }

  for (const pair of pairs.values()) {
    if (pair.length !== 2) continue;

    for (let i = 0; i < pair.length; i++) {
      const projectile = pair[i];
      const speed = Math.hypot(projectile.vx, projectile.vy);
      if (speed <= 0) continue;

      const perpX = -projectile.vy / speed;
      const perpY = projectile.vx / speed;
      const side = i === 0 ? -1 : 1;
      projectile.x += perpX * BALTTATO_SUPERPOSITION_INITIAL_OFFSET * side;
      projectile.y += perpY * BALTTATO_SUPERPOSITION_INITIAL_OFFSET * side;
      projectile.superpositionSpreadVx = perpX * BALTTATO_SUPERPOSITION_SPREAD_SPEED * side;
      projectile.superpositionSpreadVy = perpY * BALTTATO_SUPERPOSITION_SPREAD_SPEED * side;
      projectile.superpositionOriginalColor = projectile.color;
      projectile.color = BALTTATO_SUPERPOSITION_COLOR;
    }

    logDebug(3, "Superposition pair separated at launch", {
      pairId: pair[0].superpositionPairId,
      initialSpacing: BALTTATO_SUPERPOSITION_INITIAL_OFFSET * 2,
      spreadSpeed: BALTTATO_SUPERPOSITION_SPREAD_SPEED
    });
  }
};

function balttatoResolveSuperpositionBoundary(projectile, arenaWidth, arenaHeight, bouncedX, bouncedY) {
  if (!projectile.superpositionPairId || projectile.superpositionResolved) return false;

  const twin = projectile.twin;
  const pairId = projectile.superpositionPairId;
  const realProjectile = Math.random() < 0.5 ? projectile : twin;
  const fakeProjectile = realProjectile === projectile ? twin : projectile;
  if (!realProjectile) return false;

  projectile.superpositionResolved = true;
  projectile.superpositionPairId = null;
  projectile.twin = null;

  if (twin) {
    twin.superpositionResolved = true;
    twin.superpositionPairId = null;
    twin.twin = null;
  }

  if (fakeProjectile) {
    fakeProjectile.isDestroyed = true;
  }

  // The boundary is the measurement point. The surviving real projectile
  // is the one that gets the physical ricochet response. If the twin was
  // selected as real, reflect it using the wall(s) that caused the pair to
  // collapse, so it is sent back into the arena from the measurement event.
  if (bouncedX) realProjectile.vx = -realProjectile.vx;
  if (bouncedY) realProjectile.vy = -realProjectile.vy;

  if (realProjectile.x < realProjectile.radius) realProjectile.x = realProjectile.radius;
  if (realProjectile.x > arenaWidth - realProjectile.radius) realProjectile.x = arenaWidth - realProjectile.radius;
  if (realProjectile.y < realProjectile.radius) realProjectile.y = realProjectile.radius;
  if (realProjectile.y > arenaHeight - realProjectile.radius) realProjectile.y = arenaHeight - realProjectile.radius;

  realProjectile.superpositionOriginalColor = realProjectile.superpositionOriginalColor || realProjectile.color;
  realProjectile.color = realProjectile.superpositionOriginalColor;

  logDebug(3, "Superposition collapsed at ricochet boundary", {
    pairId,
    real: realProjectile === projectile ? "boundary projectile" : "twin projectile",
    fakeDestroyed: !!fakeProjectile,
    bouncedX,
    bouncedY
  });
  return true;
}

const balttatoOriginalProjectileUpdateRunState = Projectile.prototype.update;
Projectile.prototype.update = function(dt, arenaWidth = 800, arenaHeight = 600) {
  const beforeX = this.x;
  const beforeY = this.y;
  const beforeVx = this.vx;
  const beforeVy = this.vy;
  const beforeRicochet = this.ricochetRemaining;

  if (this.superpositionPairId && !this.superpositionResolved) {
    this.vx += (this.superpositionSpreadVx || 0) * dt;
    this.vy += (this.superpositionSpreadVy || 0) * dt;
  }
  const result = balttatoOriginalProjectileUpdateRunState.call(this, dt, arenaWidth, arenaHeight);

  if (this.superpositionPairId && !this.superpositionResolved && this.ricochetRemaining < beforeRicochet) {
    const bouncedX = Math.sign(this.vx) !== Math.sign(beforeVx) && Math.abs(this.x - Math.max(this.radius, Math.min(arenaWidth - this.radius, this.x))) < 0.001;
    const bouncedY = Math.sign(this.vy) !== Math.sign(beforeVy) && Math.abs(this.y - Math.max(this.radius, Math.min(arenaHeight - this.radius, this.y))) < 0.001;
    balttatoResolveSuperpositionBoundary(this, arenaWidth, arenaHeight, bouncedX, bouncedY);
  }

  return result;
};

/*
 * Several gameplay layers wrap checkCollisions. A collision can trigger an
 * enemy defeat, which can trigger additional effects that reach the collision
 * wrapper again. Prevent re-entry into the wrapper chain from exhausting the
 * JavaScript call stack.
 */
const balttatoCollisionWrapperBeforeSafety = GameManager.prototype.checkCollisions;
GameManager.prototype.checkCollisions = function() {
  if (this.__balttatoCollisionCheckActive) {
    logDebug(0, "Prevented recursive checkCollisions re-entry");
    return;
  }

  const superpositionProjectiles = [];
  for (let i = 0; i < this.projectiles.length; i++) {
    const projectile = this.projectiles[i];
    if (projectile.superpositionResolved && projectile.superpositionOriginalColor) {
      superpositionProjectiles.push(projectile);
    }
  }

  this.__balttatoCollisionCheckActive = true;
  try {
    return balttatoCollisionWrapperBeforeSafety.call(this);
  } finally {
    this.__balttatoCollisionCheckActive = false;
    for (let i = 0; i < superpositionProjectiles.length; i++) {
      const projectile = superpositionProjectiles[i];
      if (!projectile.superpositionPairId) projectile.color = projectile.superpositionOriginalColor;
    }
  }
};

logDebug(1, "Run-state persistence, Luck scaling, Superposition spacing, boundary collapse, and collision re-entry safety enabled");
