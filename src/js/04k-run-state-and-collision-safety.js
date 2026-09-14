/*
 * Run-state persistence and collision safety. The upgrade screen is the only
 * point where a run is persisted: refreshing the page returns to the exact
 * upgrade choices and player progression that were present at that screen.
 */

const BALTTATO_RUN_STATE_COOKIE = "balttato_run_state";
const BALTTATO_RUN_STATE_MAX_AGE = 60 * 60 * 24 * 7;

function balttatoSetRunStateCookie(game) {
  if (!game || game.state !== "LEVEL_UP") return;

  const snapshot = {
    player: game.player,
    playerLevel: game.playerLevel,
    currentXp: game.currentXp,
    xpThreshold: game.xpThreshold,
    totalScore: game.totalScore,
    totalKills: game.totalKills,
    rerollTokens: game.rerollTokens || 0,
    bossTier: game.bossTier,
    bossWarningTimer: game.bossWarningTimer,
    activeCards: game.upgradeManager.activeCards
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
      choices: game.upgradeManager.activeCards.length
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
    game.playerLevel = Number.isFinite(snapshot.playerLevel) ? snapshot.playerLevel : game.playerLevel;
    game.currentXp = Number.isFinite(snapshot.currentXp) ? snapshot.currentXp : game.currentXp;
    game.xpThreshold = Number.isFinite(snapshot.xpThreshold) ? snapshot.xpThreshold : game.xpThreshold;
    game.totalScore = Number.isFinite(snapshot.totalScore) ? snapshot.totalScore : game.totalScore;
    game.totalKills = Number.isFinite(snapshot.totalKills) ? snapshot.totalKills : game.totalKills;
    game.rerollTokens = Number.isFinite(snapshot.rerollTokens) ? snapshot.rerollTokens : 0;
    game.bossTier = Number.isFinite(snapshot.bossTier) ? snapshot.bossTier : game.bossTier;
    game.bossWarningTimer = Number.isFinite(snapshot.bossWarningTimer) ? snapshot.bossWarningTimer : 0;
    game.upgradeManager.activeCards = snapshot.activeCards;
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
