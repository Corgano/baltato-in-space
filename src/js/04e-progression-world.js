/*
 * Progression and world-scale tuning layered after the core GameManager and
 * gameplay-fix systems. Keeps the existing simulation structure intact while
 * making the arena and XP curve respond smoothly to player level.
 */

const BALTTATO_WORLD_BASE_MULTIPLIER = 1.5;
const BALTTATO_WORLD_LEVEL_GROWTH = 0.01;
const BALTTATO_DYNAMIC_CAMERA_MARGIN = 20;

function balttatoWorldMultiplier(level) {
  return BALTTATO_WORLD_BASE_MULTIPLIER + Math.max(0, level - 1) * BALTTATO_WORLD_LEVEL_GROWTH;
}

function balttatoUpdateWorldDimensions(game) {
  const multiplier = balttatoWorldMultiplier(game.playerLevel);
  game.worldWidth = Math.round(game.width * multiplier);
  game.worldHeight = Math.round(game.height * multiplier);
}

// P-1: Keep the playable world close to 1.5x the viewport at level 1, then
// grow it by 1% of the viewport per level. The camera may look up to 20px past
// the world edge so the player is not visually pinned against the frame.
GameManager.prototype.updateCamera = function() {
  balttatoUpdateWorldDimensions(this);

  const worldWidth = this.worldWidth;
  const worldHeight = this.worldHeight;
  const zoom = typeof BALTTATO_CAMERA_ZOOM === "number" ? BALTTATO_CAMERA_ZOOM : 0.8;
  const visibleWorldWidth = this.width / zoom;
  const visibleWorldHeight = this.height / zoom;
  const maxCameraX = worldWidth - visibleWorldWidth + BALTTATO_DYNAMIC_CAMERA_MARGIN;
  const maxCameraY = worldHeight - visibleWorldHeight + BALTTATO_DYNAMIC_CAMERA_MARGIN;

  this.cameraX = Math.max(
    -BALTTATO_DYNAMIC_CAMERA_MARGIN,
    Math.min(maxCameraX, this.player.x - visibleWorldWidth / 2)
  );
  this.cameraY = Math.max(
    -BALTTATO_DYNAMIC_CAMERA_MARGIN,
    Math.min(maxCameraY, this.player.y - visibleWorldHeight / 2)
  );
};

// P-1: Initialize the player and camera together after all world-size layers
// have been installed. This prevents the first rendered frame from inheriting
// the old viewport origin and briefly placing the player at a map corner.
const balttatoOriginalInitProgressionWorld = GameManager.prototype.init;
GameManager.prototype.init = function() {
  balttatoOriginalInitProgressionWorld.call(this);
  balttatoUpdateWorldDimensions(this);
  this.player.x = this.worldWidth / 2;
  this.player.y = this.worldHeight / 2;
  this.updateCamera();
  logDebug(1, "World start position initialized", {
    worldWidth: this.worldWidth,
    worldHeight: this.worldHeight,
    playerX: this.player.x,
    playerY: this.player.y,
    cameraX: this.cameraX,
    cameraY: this.cameraY
  });
};

// P-1: Reset the player and camera to the center of the current world when a
// run restarts, rather than relying on the viewport-sized reset coordinates.
const balttatoOriginalRestartGameProgressionWorld = GameManager.prototype.restartGame;
GameManager.prototype.restartGame = function() {
  balttatoOriginalRestartGameProgressionWorld.call(this);
  balttatoUpdateWorldDimensions(this);
  this.player.x = this.worldWidth / 2;
  this.player.y = this.worldHeight / 2;
  this.updateCamera();
  logDebug(1, "World start position reset", {
    worldWidth: this.worldWidth,
    worldHeight: this.worldHeight,
    playerX: this.player.x,
    playerY: this.player.y,
    cameraX: this.cameraX,
    cameraY: this.cameraY
  });
};

// P-1: Harder enemies award XP in proportion to their health while retaining
// the existing archetype minimums so early-game rewards do not regress.
const balttatoOriginalHandleEnemyDefeatProgression = GameManager.prototype.handleEnemyDefeat;
GameManager.prototype.handleEnemyDefeat = function(enemy) {
  const originalDroppedItems = this.droppedItems;
  const originalPush = originalDroppedItems.push.bind(originalDroppedItems);
  const interceptedItems = [];

  originalDroppedItems.push = (...items) => {
    interceptedItems.push(...items);
    return interceptedItems.length;
  };

  try {
    balttatoOriginalHandleEnemyDefeatProgression.call(this, enemy);
  } finally {
    originalDroppedItems.push = originalPush;
  }

  for (let i = 0; i < interceptedItems.length; i++) {
    const item = interceptedItems[i];
    if (item && !item.isBossCache) {
      item.value = Math.max(item.value, Math.round(enemy.maxHealth * 0.30));
    }
    originalDroppedItems.push(item);
  }
};

// P-1: Tune the XP curve so upgrade choices occur more often while still
// increasing steadily. The curve remains intentionally super-linear later on.
const balttatoOriginalCalculateXpThreshold = GameManager.prototype.calculateXpThreshold;
GameManager.prototype.calculateXpThreshold = function(level) {
  if (level <= 1) return 20;
  if (level === 2) return 35;
  if (level === 3) return 55;

  const base = 55;
  const linear = (level - 3) * 22;
  const quadratic = Math.floor(Math.pow(level - 3, 1.3) * 12);
  return base + linear + quadratic;
};

// P-1: Bosses drop a large cache worth roughly 85% of the XP needed for the
// next level, making a boss kill a meaningful progression event without always
// forcing an immediate level-up by itself.
const balttatoOriginalHandleEnemyDefeatWithBossCache = GameManager.prototype.handleEnemyDefeat;
GameManager.prototype.handleEnemyDefeat = function(enemy) {
  const originalDroppedItems = this.droppedItems;
  const originalPush = originalDroppedItems.push.bind(originalDroppedItems);
  const interceptedItems = [];

  originalDroppedItems.push = (...items) => {
    interceptedItems.push(...items);
    return interceptedItems.length;
  };

  try {
    balttatoOriginalHandleEnemyDefeatWithBossCache.call(this, enemy);
  } finally {
    originalDroppedItems.push = originalPush;
  }

  for (let i = 0; i < interceptedItems.length; i++) {
    const item = interceptedItems[i];
    if (enemy.isBoss && item && item.isBossCache) {
      item.value = Math.max(1, Math.round(this.calculateXpThreshold(this.playerLevel) * 0.85));
    }
    originalDroppedItems.push(item);
  }
};

// Bosses now arrive every five player levels rather than every three.
const balttatoOriginalFinalizeCardSelectionProgression = GameManager.prototype.finalizeCardSelection;
GameManager.prototype.finalizeCardSelection = function(index) {
  const originalTriggerBossWarning = this.triggerBossWarning;

  this.triggerBossWarning = () => {};

  try {
    balttatoOriginalFinalizeCardSelectionProgression.call(this, index);
  } finally {
    this.triggerBossWarning = originalTriggerBossWarning;
  }

  this.bossWarningTimer = 0;
  if (this.playerLevel % 5 === 0 && !this.activeBoss) {
    this.triggerBossWarning();
  }
};

logDebug(1, "Dynamic world scaling and revised XP progression enabled", {
  baseWorldMultiplier: BALTTATO_WORLD_BASE_MULTIPLIER,
  worldGrowthPerLevel: BALTTATO_WORLD_LEVEL_GROWTH,
  bossIntervalLevels: 5
});