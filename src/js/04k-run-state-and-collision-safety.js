/*
 * Run-state persistence and collision safety. The upgrade screen is the only
 * point where a run is persisted: refreshing the page returns to the exact
 * upgrade choices and player progression that were present at that screen.
 */

const BALTTATO_RUN_STATE_COOKIE = "balttato_run_state";
const BALTTATO_RUN_STATE_MAX_AGE = 60 * 60 * 24 * 7;

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
    for (let i = 0; i < snapshot.player.acquiredJokers.length; i++) {
      const jokerId = snapshot.player.acquiredJokers[i];
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

  this.__balttatoCollisionCheckActive = true;
  try {
    return balttatoCollisionWrapperBeforeSafety.call(this);
  } finally {
    this.__balttatoCollisionCheckActive = false;
  }
};

logDebug(1, "Run-state persistence and collision re-entry safety enabled");
