/*
 * Safe gameplay fixes layered after GameManager so the original systems remain
 * intact while the arena gains continuous collision detection, pause support,
 * and a scrolling 4x world.
 */

const BALTTATO_WORLD_WIDTH = 3200;
const BALTTATO_WORLD_HEIGHT = 2400;
const BALTTATO_CAMERA_MARGIN = 10;

const balttatoOriginalProjectileUpdate = Projectile.prototype.update;
Projectile.prototype.update = function(dt, arenaWidth = 800, arenaHeight = 600) {
  this.previousX = this.x;
  this.previousY = this.y;
  balttatoOriginalProjectileUpdate.call(this, dt, arenaWidth, arenaHeight);
};

function balttatoSegmentCircleHit(x1, y1, x2, y2, cx, cy, radius) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = dx * dx + dy * dy;

  if (a <= 0) {
    return Math.hypot(x1 - cx, y1 - cy) <= radius ? 0 : null;
  }

  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) return null;

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDiscriminant) / (2 * a);
  const t2 = (-b + sqrtDiscriminant) / (2 * a);

  if (t1 >= 0 && t1 <= 1) return t1;
  if (t2 >= 0 && t2 <= 1) return t2;
  return null;
}

const balttatoOriginalCheckCollisions = GameManager.prototype.checkCollisions;
GameManager.prototype.checkCollisions = function() {
  const projectilePositions = [];

  for (let i = 0; i < this.projectiles.length; i++) {
    const projectile = this.projectiles[i];
    if (projectile.isDestroyed || projectile.previousX === undefined) continue;

    let firstHit = null;
    let firstT = Infinity;

    for (let j = 0; j < this.enemies.length; j++) {
      const enemy = this.enemies[j];
      if (enemy.isDestroyed || projectile.hitEntities.has(enemy)) continue;

      const t = balttatoSegmentCircleHit(
        projectile.previousX,
        projectile.previousY,
        projectile.x,
        projectile.y,
        enemy.x,
        enemy.y,
        projectile.radius + enemy.radius
      );

      if (t !== null && t < firstT) {
        firstT = t;
        firstHit = enemy;
      }
    }

    projectilePositions.push({ projectile, x: projectile.x, y: projectile.y });

    if (firstHit) {
      projectile.x = projectile.previousX + (projectile.x - projectile.previousX) * firstT;
      projectile.y = projectile.previousY + (projectile.y - projectile.previousY) * firstT;
    }
  }

  const playerWasInvulnerable = this.player.invulnerableTimer > 0;
  balttatoOriginalCheckCollisions.call(this);

  if (!playerWasInvulnerable && this.state !== "GAME_OVER") {
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.isDestroyed || enemy.isBoss) continue;
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist < enemy.radius + this.player.radius && this.player.invulnerableTimer > 0) {
        this.handleEnemyDefeat(enemy);
        break;
      }
    }
  }

  for (let i = 0; i < projectilePositions.length; i++) {
    const position = projectilePositions[i];
    position.projectile.x = position.x;
    position.projectile.y = position.y;
  }
};

const balttatoOriginalSpawnEnemies = GameManager.prototype.spawnEnemies;
GameManager.prototype.spawnEnemies = function(dt) {
  const viewportWidth = this.width;
  const viewportHeight = this.height;
  this.width = this.worldWidth || BALTTATO_WORLD_WIDTH;
  this.height = this.worldHeight || BALTTATO_WORLD_HEIGHT;
  balttatoOriginalSpawnEnemies.call(this, dt);
  this.width = viewportWidth;
  this.height = viewportHeight;
};

const balttatoOriginalHandleEnemyDefeat = GameManager.prototype.handleEnemyDefeat;
GameManager.prototype.handleEnemyDefeat = function(enemy) {
  const viewportWidth = this.width;
  const viewportHeight = this.height;
  this.width = this.worldWidth || BALTTATO_WORLD_WIDTH;
  this.height = this.worldHeight || BALTTATO_WORLD_HEIGHT;
  balttatoOriginalHandleEnemyDefeat.call(this, enemy);
  this.width = viewportWidth;
  this.height = viewportHeight;
};

const balttatoOriginalCleanDestroyedEntities = GameManager.prototype.cleanDestroyedEntities;
GameManager.prototype.cleanDestroyedEntities = function() {
  const viewportWidth = this.width;
  const viewportHeight = this.height;
  this.width = this.worldWidth || BALTTATO_WORLD_WIDTH;
  this.height = this.worldHeight || BALTTATO_WORLD_HEIGHT;
  balttatoOriginalCleanDestroyedEntities.call(this);
  this.width = viewportWidth;
  this.height = viewportHeight;
};

const balttatoOriginalSpawnBoss = GameManager.prototype.spawnBoss;
GameManager.prototype.spawnBoss = function() {
  const viewportWidth = this.width;
  const viewportHeight = this.height;
  this.width = this.worldWidth || BALTTATO_WORLD_WIDTH;
  this.height = this.worldHeight || BALTTATO_WORLD_HEIGHT;
  balttatoOriginalSpawnBoss.call(this);
  this.width = viewportWidth;
  this.height = viewportHeight;
};

const balttatoOriginalInit = GameManager.prototype.init;
GameManager.prototype.init = function() {
  this.worldWidth = BALTTATO_WORLD_WIDTH;
  this.worldHeight = BALTTATO_WORLD_HEIGHT;
  this.cameraX = this.worldWidth / 2 - this.width / 2;
  this.cameraY = this.worldHeight / 2 - this.height / 2;
  this.player.x = this.worldWidth / 2;
  this.player.y = this.worldHeight / 2;
  balttatoOriginalInit.call(this);
};

const balttatoOriginalRestartGame = GameManager.prototype.restartGame;
GameManager.prototype.restartGame = function() {
  balttatoOriginalRestartGame.call(this);
  this.player.x = this.worldWidth / 2;
  this.player.y = this.worldHeight / 2;
  this.cameraX = this.worldWidth / 2 - this.width / 2;
  this.cameraY = this.worldHeight / 2 - this.height / 2;
};

const balttatoOriginalUpdateEntities = GameManager.prototype.updateEntities;
GameManager.prototype.updateEntities = function(dt) {
  const viewportWidth = this.width;
  const viewportHeight = this.height;
  this.width = this.worldWidth || BALTTATO_WORLD_WIDTH;
  this.height = this.worldHeight || BALTTATO_WORLD_HEIGHT;
  balttatoOriginalUpdateEntities.call(this, dt);
  this.width = viewportWidth;
  this.height = viewportHeight;
};

GameManager.prototype.updateCamera = function() {
  const worldWidth = this.worldWidth || BALTTATO_WORLD_WIDTH;
  const worldHeight = this.worldHeight || BALTTATO_WORLD_HEIGHT;
  const maxCameraX = worldWidth - this.width + BALTTATO_CAMERA_MARGIN;
  const maxCameraY = worldHeight - this.height + BALTTATO_CAMERA_MARGIN;

  this.cameraX = Math.max(
    -BALTTATO_CAMERA_MARGIN,
    Math.min(maxCameraX, this.player.x - this.width / 2)
  );
  this.cameraY = Math.max(
    -BALTTATO_CAMERA_MARGIN,
    Math.min(maxCameraY, this.player.y - this.height / 2)
  );
};

GameManager.prototype.renderWorldArenaGrid = function() {
  const worldWidth = this.worldWidth || BALTTATO_WORLD_WIDTH;
  const worldHeight = this.worldHeight || BALTTATO_WORLD_HEIGHT;
  const cellSize = 40;

  this.ctx.save();
  this.ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
  this.ctx.lineWidth = 1;

  for (let x = 0; x <= worldWidth; x += cellSize) {
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, worldHeight);
    this.ctx.stroke();
  }
  for (let y = 0; y <= worldHeight; y += cellSize) {
    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(worldWidth, y);
    this.ctx.stroke();
  }

  this.ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
  this.ctx.lineWidth = 2;
  this.ctx.strokeRect(0, 0, worldWidth, worldHeight);
  this.ctx.restore();
};

GameManager.prototype.togglePause = function() {
  if (this.state === "PLAYING") {
    this.state = "PAUSED";
    this.activeKeys.clear();
    logDebug(1, "Game paused by player");
  } else if (this.state === "PAUSED") {
    this.state = "PLAYING";
    this.lastTimestamp = performance.now();
    logDebug(1, "Game resumed by player");
  }
};

window.addEventListener("keydown", (e) => {
  if (e.code !== "Escape") return;
  const game = window.__arenaGameInstance;
  if (!game) return;
  if (game.state !== "PLAYING" && game.state !== "PAUSED") return;
  e.preventDefault();
  game.togglePause();
});

const balttatoOriginalRenderOverlays = GameManager.prototype.renderOverlays;
GameManager.prototype.renderOverlays = function() {
  balttatoOriginalRenderOverlays.call(this);

  if (this.state !== "PAUSED") return;

  const centerX = this.width / 2;
  const centerY = this.height / 2;

  this.ctx.save();
  this.ctx.fillStyle = "rgba(7, 10, 19, 0.78)";
  this.ctx.fillRect(0, 0, this.width, this.height);
  this.ctx.textAlign = "center";
  this.ctx.textBaseline = "middle";

  this.ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  this.ctx.fillStyle = "#ffffff";
  this.ctx.fillText("GAME PAUSED", centerX, centerY - 80);

  this.ctx.font = "15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  this.ctx.fillStyle = "#cbd5e1";
  this.ctx.fillText(`Score: ${this.totalScore}  |  Hostiles Purged: ${this.totalKills}  |  Level: ${this.playerLevel}`, centerX, centerY - 25);
  this.ctx.fillText(`Hull: ${this.player.health} / ${this.player.maxHealth}  |  XP: ${this.currentXp} / ${this.xpThreshold}`, centerX, centerY + 5);

  this.ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  this.ctx.fillStyle = "#38bdf8";
  this.ctx.fillText("PRESS ESC TO RESUME", centerX, centerY + 65);
  this.ctx.restore();
};

GameManager.prototype.gameLoop = function(currentTimestamp) {
  let dt = (currentTimestamp - this.lastTimestamp) / 1000.0;
  this.lastTimestamp = currentTimestamp;

  if (dt > 0.1) {
    dt = 0.1;
  }

  this.updateCamera();
  this.ctx.clearRect(0, 0, this.width, this.height);

  this.ctx.save();
  this.ctx.translate(-this.cameraX, -this.cameraY);
  this.renderWorldArenaGrid();
  this.ctx.restore();

  if (this.state === "PLAYING") {
    this.spawnEnemies(dt);
    this.handleAutoCombat(dt);
    this.updateEntities(dt);
    this.checkCollisions();
    this.cleanDestroyedEntities();
    this.updateCamera();
  }

  this.ctx.save();
  this.ctx.translate(-this.cameraX, -this.cameraY);

  for (let i = 0; i < this.droppedItems.length; i++) {
    this.droppedItems[i].draw(this.ctx);
  }

  this.renderAimGuide();

  for (let i = 0; i < this.projectiles.length; i++) {
    this.projectiles[i].draw(this.ctx);
  }

  for (let i = 0; i < this.blastEffects.length; i++) {
    this.blastEffects[i].draw(this.ctx);
  }

  for (let i = 0; i < this.lightningArcs.length; i++) {
    this.lightningArcs[i].draw(this.ctx);
  }

  for (let i = 0; i < this.enemyProjectiles.length; i++) {
    this.enemyProjectiles[i].draw(this.ctx);
  }

  for (let i = 0; i < this.enemies.length; i++) {
    this.enemies[i].draw(this.ctx);
  }

  this.player.draw(this.ctx);

  for (let i = 0; i < this.floatingTexts.length; i++) {
    this.floatingTexts[i].draw(this.ctx);
  }

  this.ctx.restore();

  this.renderBossTopBar();
  this.renderBossWarning();

  try {
    if (this.state === "LEVEL_UP") {
      this.updateCardBurn(dt);
      if (this.state === "LEVEL_UP") {
        this.upgradeManager.drawOverlay(this.ctx, this.width, this.height, this.playerLevel, this.cardBurn.active ? this.cardBurn : null);
      }
    } else {
      this.renderOverlays();
    }
  } catch (overlayErr) {
    logDebug(0, "Error during overlay rendering", overlayErr);
  }

  this.animationFrameId = requestAnimationFrame((ts) => this.gameLoop(ts));
};
