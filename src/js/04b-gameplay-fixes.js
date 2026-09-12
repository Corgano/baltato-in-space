/*
 * Safe gameplay fixes layered after GameManager so the original systems remain
 * intact while the arena gains continuous collision detection, pause support,
 * and a scrolling 4x world.
 */

const BALTTATO_WORLD_WIDTH = 3200;
const BALTTATO_WORLD_HEIGHT = 2400;
const BALTTATO_CAMERA_MARGIN = 10;
const BALTTATO_CAMERA_ZOOM = 0.8;
const BALTTATO_SPAWN_START_COUNT = 3;
const BALTTATO_SPAWN_COUNT_GROWTH_SECONDS = 20;
const BALTTATO_SPAWN_COUNT_STEP = 1;
const BALTTATO_SPAWN_COUNT_CAP = 24;
const BALTTATO_SWARMER_CLUSTER_CAP = 8;
const BALTTATO_SWARMER_SPREAD_BASE = 35;
const BALTTATO_SWARMER_SPREAD_GROWTH = 2.5;
const BALTTATO_SWARMER_SPREAD_CAP = 220;

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
  this.cameraX = this.worldWidth / 2 - this.width / (2 * BALTTATO_CAMERA_ZOOM);
  this.cameraY = this.worldHeight / 2 - this.height / (2 * BALTTATO_CAMERA_ZOOM);
  this.player.x = this.worldWidth / 2;
  this.player.y = this.worldHeight / 2;
  this.spawnDirectorTimer = 0;
  balttatoOriginalInit.call(this);
};

const balttatoOriginalRestartGame = GameManager.prototype.restartGame;
GameManager.prototype.restartGame = function() {
  balttatoOriginalRestartGame.call(this);
  this.player.x = this.worldWidth / 2;
  this.player.y = this.worldHeight / 2;
  this.cameraX = this.worldWidth / 2 - this.width / (2 * BALTTATO_CAMERA_ZOOM);
  this.cameraY = this.worldHeight / 2 - this.height / (2 * BALTTATO_CAMERA_ZOOM);
  this.spawnDirectorTimer = 0;
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
  const visibleWorldWidth = this.width / BALTTATO_CAMERA_ZOOM;
  const visibleWorldHeight = this.height / BALTTATO_CAMERA_ZOOM;
  const maxCameraX = worldWidth - visibleWorldWidth + BALTTATO_CAMERA_MARGIN;
  const maxCameraY = worldHeight - visibleWorldHeight + BALTTATO_CAMERA_MARGIN;

  this.cameraX = Math.max(
    -BALTTATO_CAMERA_MARGIN,
    Math.min(maxCameraX, this.player.x - visibleWorldWidth / 2)
  );
  this.cameraY = Math.max(
    -BALTTATO_CAMERA_MARGIN,
    Math.min(maxCameraY, this.player.y - visibleWorldHeight / 2)
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
  this.ctx.translate(-this.cameraX * BALTTATO_CAMERA_ZOOM, -this.cameraY * BALTTATO_CAMERA_ZOOM);
  this.ctx.scale(BALTTATO_CAMERA_ZOOM, BALTTATO_CAMERA_ZOOM);
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
  this.ctx.translate(-this.cameraX * BALTTATO_CAMERA_ZOOM, -this.cameraY * BALTTATO_CAMERA_ZOOM);
  this.ctx.scale(BALTTATO_CAMERA_ZOOM, BALTTATO_CAMERA_ZOOM);

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

/* TODO 9-13: explosion persistence, explosion chains, penetration synergies,
 * and reroll tokens. Kept in the existing gameplay-fix layer to avoid adding
 * another runtime script to the game. */

function balttatoLuckCurve(luck, cap = 1, rate = 0.2) {
  return cap * (1 - Math.exp(-rate * Math.max(0, Number(luck) || 0)));
}

function balttatoExplosionRanks(player) {
  return (player.acquiredUpgrades || []).filter((title) => title === "PLASMA WARHEAD").length;
}

function balttatoExplosionChainChance(player) {
  const ranks = balttatoExplosionRanks(player);
  if (ranks <= 0) return 0;
  const base = Math.min(0.5, ranks * 0.05);
  return Math.min(1, base + (1 - base) * balttatoLuckCurve(player.luck, 1, 0.2));
}

function balttatoFragmentChance(player) {
  const ranks = Math.max(0, Number(player.fragmentation) || 0);
  if (ranks <= 0) return 0;
  const base = 0.05;
  const rankCurve = 1 - Math.exp(-0.18 * ranks);
  const chance = base + (0.75 - base) * rankCurve;
  return Math.min(0.75, chance + (0.75 - chance) * balttatoLuckCurve(player.luck, 1, 0.22));
}

function balttatoChainLightningChance(player) {
  return Math.min(0.75, 0.10 + 0.65 * balttatoLuckCurve(player.luck, 1, 0.22));
}

function balttatoCreateChainExplosion(game, x, y, damage, depth) {
  if (depth > 8) return;
  const blast = new BlastEffect(x, y, game.player.blastRadius, "#f59e0b", 0.34);
  blast.chainExplosion = true;
  blast.chainDepth = depth;
  blast.chainDamage = Math.max(2, Math.round(damage * 0.65));
  blast.hitCooldowns = new Map();
  game.blastEffects.push(blast);
}

function balttatoProcessBlastWave(game, blast, dt) {
  if (!blast || blast.isDestroyed) return;
  if (!blast.hitCooldowns) blast.hitCooldowns = new Map();

  const progress = Math.min(1, blast.elapsed / blast.duration);
  const waveRadius = progress * blast.maxRadius;
  if (waveRadius <= 0) return;

  const waveThickness = 10;
  const damage = blast.chainExplosion ? blast.chainDamage : Math.max(2, Math.round(game.player.damage * 0.42));

  for (let i = 0; i < game.enemies.length; i++) {
    const enemy = game.enemies[i];
    if (enemy.isDestroyed) continue;

    const distance = Math.hypot(enemy.x - blast.x, enemy.y - blast.y);
    if (Math.abs(distance - waveRadius) > waveThickness + enemy.radius) continue;

    const cooldown = blast.hitCooldowns.get(enemy) || 0;
    if (cooldown > 0) {
      blast.hitCooldowns.set(enemy, Math.max(0, cooldown - dt));
      continue;
    }

    blast.hitCooldowns.set(enemy, 0.12);
    const waveDamage = Math.max(1, Math.round(damage * (enemy.isBoss ? 0.8 : 1)));
    const killed = enemy.takeDamage(waveDamage);
    game.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 10, `${waveDamage}`, "#f59e0b", 0.42));

    if (killed) {
      game.handleEnemyDefeat(enemy);
      if (Math.random() < balttatoExplosionChainChance(game.player)) {
        balttatoCreateChainExplosion(game, enemy.x, enemy.y, waveDamage, (blast.chainDepth || 0) + 1);
      }
    }
  }
}

const balttatoOriginalCheckCollisionsTodo913 = GameManager.prototype.checkCollisions;
GameManager.prototype.checkCollisions = function() {
  const penetrationCandidates = [];
  for (let i = 0; i < this.projectiles.length; i++) {
    const proj = this.projectiles[i];
    if (!proj.isDestroyed && proj.pierceRemaining > 0 && !proj.isFragment) {
      penetrationCandidates.push({ proj, hitCount: proj.hitEntities.size });
    }
  }

  const blastCountBefore = this.blastEffects.length;
  balttatoOriginalCheckCollisionsTodo913.call(this);

  for (let i = blastCountBefore; i < this.blastEffects.length; i++) {
    const blast = this.blastEffects[i];
    if (!blast.hitCooldowns) blast.hitCooldowns = new Map();
  }
  for (let i = 0; i < this.blastEffects.length; i++) {
    balttatoProcessBlastWave(this, this.blastEffects[i], 1 / 60);
  }

  for (let i = 0; i < penetrationCandidates.length; i++) {
    const { proj, hitCount } = penetrationCandidates[i];
    if (proj.isDestroyed || proj.hitEntities.size <= hitCount) continue;

    const fragmentationLimit = Math.max(0, Math.round(this.player.fragmentation));
    proj.penetrationFragmentsSpawned = proj.penetrationFragmentsSpawned || 0;
    const fragmentChance = balttatoFragmentChance(this.player);

    if (fragmentationLimit > proj.penetrationFragmentsSpawned && Math.random() < fragmentChance) {
      let source = null;
      for (const enemy of this.enemies) {
        if (proj.hitEntities.has(enemy)) {
          source = enemy;
          break;
        }
      }
      if (source) {
        const angle = Math.atan2(proj.vy, proj.vx) + (Math.random() - 0.5) * 0.7;
        const speed = Math.max(220, Math.hypot(proj.vx, proj.vy) * 0.7);
        const shard = new Projectile(
          source.x + Math.cos(angle) * 8,
          source.y + Math.sin(angle) * 8,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          3.5,
          Math.max(2, Math.round(proj.damage * 0.45)),
          0,
          "#fb923c",
          false,
          0,
          false,
          0,
          0,
          300
        );
        shard.isFragment = true;
        proj.hitEntities.forEach((enemy) => shard.hitEntities.add(enemy));
        this.projectiles.push(shard);
        proj.penetrationFragmentsSpawned += 1;
      }
    }

    if (proj.chainRemaining > 0 && Math.random() < balttatoChainLightningChance(this.player)) {
      let source = null;
      for (const enemy of this.enemies) {
        if (proj.hitEntities.has(enemy)) {
          source = enemy;
          break;
        }
      }
      if (source) {
        let target = null;
        let targetDist = this.player.chainRange;
        for (const enemy of this.enemies) {
          if (enemy.isDestroyed || proj.hitEntities.has(enemy)) continue;
          const distance = Math.hypot(enemy.x - source.x, enemy.y - source.y);
          if (distance < targetDist) {
            targetDist = distance;
            target = enemy;
          }
        }
        if (target) {
          proj.hitEntities.add(target);
          proj.chainRemaining -= 1;
          this.lightningArcs.push(new LightningArc(source.x, source.y, target.x, target.y, "#22d3ee", 0.25));
          const damage = Math.max(1, Math.round(this.player.damage * 0.55));
          const killed = target.takeDamage(damage);
          this.floatingTexts.push(new FloatingText(target.x, target.y - 12, `${damage}`, "#22d3ee", 0.5));
          if (killed) this.handleEnemyDefeat(target);
        }
      }
    }
  }
};

const balttatoOriginalHandleEnemyDefeatReroll = GameManager.prototype.handleEnemyDefeat;
GameManager.prototype.handleEnemyDefeat = function(enemy) {
  const wasHandled = enemy.hasDroppedLoot;
  balttatoOriginalHandleEnemyDefeatReroll.call(this, enemy);
  if (wasHandled) return;

  this.rerollTokens = this.rerollTokens || 0;
  if (enemy.isBoss) {
    this.rerollTokens += 1;
    this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 28, "+1 REROLL", "#60a5fa", 0.9));
    const bonusChance = Math.min(0.25, balttatoLuckCurve(this.player.luck, 1, 0.18) * 0.25);
    if (Math.random() < bonusChance) {
      this.rerollTokens += 1;
      this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 44, "+1 BONUS REROLL", "#93c5fd", 0.9));
    }
    return;
  }

  const chance = 0.005 + (0.05 - 0.005) * balttatoLuckCurve(this.player.luck, 1, 0.18);
  if (Math.random() < chance) {
    this.rerollTokens += 1;
    this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 22, "+1 REROLL", "#60a5fa", 0.8));
  }
};

const balttatoOriginalRestartGameReroll = GameManager.prototype.restartGame;
GameManager.prototype.restartGame = function() {
  balttatoOriginalRestartGameReroll.call(this);
  this.rerollTokens = 0;
};

GameManager.prototype.getRerollButtonRect = function() {
  return { x: this.width / 2 - 92, y: this.height - 58, w: 184, h: 32 };
};

GameManager.prototype.rerollOfferings = function() {
  if (this.state !== "LEVEL_UP" || this.cardBurn.active || (this.rerollTokens || 0) <= 0) return false;
  this.rerollTokens -= 1;
  this.upgradeManager.generateOfferings();
  this.rerollButtonHover = false;
  logDebug(1, "Upgrade offerings rerolled", { rerollTokens: this.rerollTokens });
  return true;
};

const balttatoOriginalHandleCanvasClickReroll = GameManager.prototype.handleCanvasClick;
GameManager.prototype.handleCanvasClick = function() {
  if (this.state === "LEVEL_UP" && !this.cardBurn.active) {
    const button = this.getRerollButtonRect();
    if (this.mouseX >= button.x && this.mouseX <= button.x + button.w && this.mouseY >= button.y && this.mouseY <= button.y + button.h) {
      this.rerollOfferings();
      return;
    }
  }
  balttatoOriginalHandleCanvasClickReroll.call(this);
};

const balttatoOriginalBindEventsReroll = GameManager.prototype.bindEvents;
GameManager.prototype.bindEvents = function() {
  balttatoOriginalBindEventsReroll.call(this);
  this.canvas.addEventListener("mousemove", (e) => {
    if (this.state !== "LEVEL_UP") return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (this.width / rect.width);
    const my = (e.clientY - rect.top) * (this.height / rect.height);
    const button = this.getRerollButtonRect();
    this.rerollButtonHover = (this.rerollTokens || 0) > 0 && mx >= button.x && mx <= button.x + button.w && my >= button.y && my <= button.y + button.h;
  });
};

const balttatoOriginalUpgradeOverlayReroll = UpgradeManager.prototype.drawOverlay;
UpgradeManager.prototype.drawOverlay = function(ctx, canvasW, canvasH, playerLevel, burnInfo = null) {
  balttatoOriginalUpgradeOverlayReroll.call(this, ctx, canvasW, canvasH, playerLevel, burnInfo);
  const game = window.__arenaGameInstance;
  if (!game || game.state !== "LEVEL_UP") return;

  const button = game.getRerollButtonRect();
  const available = (game.rerollTokens || 0) > 0;
  const hovered = available && game.rerollButtonHover;
  ctx.save();
  ctx.fillStyle = hovered ? "#2563eb" : available ? "#1e3a5f" : "#1e293b";
  ctx.strokeStyle = available ? "#60a5fa" : "#475569";
  ctx.lineWidth = hovered ? 2 : 1;
  ctx.shadowColor = hovered ? "#60a5fa" : "transparent";
  ctx.shadowBlur = hovered ? 12 : 0;
  drawRoundedRect(ctx, button.x, button.y, button.w, button.h, 5);
  ctx.fill();
  ctx.stroke();
  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = available ? "#ffffff" : "#64748b";
  ctx.fillText(`REROLL OFFERINGS  [${game.rerollTokens || 0}]`, button.x + button.w / 2, button.y + button.h / 2);
  ctx.restore();
};

/* TODO 14-16: weighted Joker rarity/recurrence and unified Luck curves. */

const BALTTATO_UPGRADE_RARITY_WEIGHTS = {
  COMMON: 1.0,
  UNCOMMON: 0.65,
  RARE: 0.35,
  EPIC: 1.0
};
const BALTTATO_JOKER_OFFERING_CHANCE = 0.0075;
const BALTTATO_EXTRA_CHOICE_CAP = 0.5;
const BALTTATO_LUCK_CURVE_RATE = 0.2;

balttatoLuckCurve = function(luck, cap = 1) {
  return cap * (1 - Math.exp(-BALTTATO_LUCK_CURVE_RATE * Math.max(0, Number(luck) || 0)));
};

function balttatoUpgradeWeight(upgrade) {
  return BALTTATO_UPGRADE_RARITY_WEIGHTS[upgrade.tierName] || 1;
}

function balttatoWeightedUpgradePick(pool) {
  let totalWeight = 0;
  for (let i = 0; i < pool.length; i++) {
    totalWeight += balttatoUpgradeWeight(pool[i]);
  }

  if (totalWeight <= 0) return pool[0];

  let roll = Math.random() * totalWeight;
  for (let i = 0; i < pool.length; i++) {
    roll -= balttatoUpgradeWeight(pool[i]);
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function balttatoExtraChoiceChance(player) {
  return balttatoLuckCurve(player ? player.luck : 0, BALTTATO_EXTRA_CHOICE_CAP);
}

const balttatoOriginalGenerateOfferingsProgression = UpgradeManager.prototype.generateOfferings;
UpgradeManager.prototype.generateOfferings = function(forceJoker = false, player = null) {
  const choiceCount = 3 + (player && Math.random() < balttatoExtraChoiceChance(player) ? 1 : 0);
  const pool = [...this.upgradeCatalog];
  const offerings = [];

  while (pool.length > 0 && offerings.length < choiceCount) {
    const chosen = balttatoWeightedUpgradePick(pool);
    offerings.push(chosen);
    const chosenIndex = pool.indexOf(chosen);
    if (chosenIndex >= 0) pool.splice(chosenIndex, 1);
  }

  this.activeCards = offerings;

  const shouldSpawnJoker = forceJoker || Math.random() < BALTTATO_JOKER_OFFERING_CHANCE;
  if (shouldSpawnJoker && this.jokerCatalog.length > 0) {
    // Jokers deliberately draw from the complete catalog every time so a Joker
    // can recur later in the same run rather than becoming permanently exhausted.
    const chosenJoker = this.jokerCatalog[Math.floor(Math.random() * this.jokerCatalog.length)];
    const slot = Math.floor(Math.random() * this.activeCards.length);
    this.activeCards[slot] = { ...chosenJoker };
    logDebug(1, "Balatro Joker offering generated", {
      joker: chosenJoker.title,
      chance: BALTTATO_JOKER_OFFERING_CHANCE,
      slot
    });
  }

  this.hoveredCardIndex = -1;

  logDebug(1, "Brotato-style upgrade offerings generated", {
    choices: this.activeCards.map(c => c.title),
    choiceCount: this.activeCards.length,
    extraChoiceChance: player ? balttatoExtraChoiceChance(player) : 0
  });

  return this.activeCards;
};

const balttatoOriginalGetCardLayoutProgression = UpgradeManager.prototype.getCardLayout;
UpgradeManager.prototype.getCardLayout = function(canvasW, canvasH) {
  const count = Math.max(3, this.activeCards.length || 3);
  if (count <= 3) return balttatoOriginalGetCardLayoutProgression.call(this, canvasW, canvasH);

  const cardW = 170;
  const cardH = 245;
  const gap = 12;
  const totalW = cardW * count + gap * (count - 1);
  const startX = (canvasW - totalW) / 2;
  const startY = canvasH / 2 - 85;

  const rects = [];
  for (let i = 0; i < count; i++) {
    rects.push({
      x: startX + i * (cardW + gap),
      y: startY,
      w: cardW,
      h: cardH
    });
  }
  return rects;
};

const balttatoOriginalTriggerLevelUpProgression = GameManager.prototype.triggerLevelUp;
GameManager.prototype.triggerLevelUp = function() {
  this.state = "LEVEL_UP";
  this.upgradeManager.generateOfferings(false, this.player);
  logDebug(1, "LEVEL UP TRIGGERED! Game paused for upgrade selection.", {
    level: this.playerLevel,
    currentXp: this.currentXp,
    threshold: this.xpThreshold,
    choices: this.upgradeManager.activeCards.length
  });
};

const balttatoOriginalRerollOfferingsProgression = GameManager.prototype.rerollOfferings;
GameManager.prototype.rerollOfferings = function() {
  if (this.state !== "LEVEL_UP" || this.cardBurn.active || (this.rerollTokens || 0) <= 0) return false;
  this.rerollTokens -= 1;
  this.upgradeManager.generateOfferings(false, this.player);
  this.rerollButtonHover = false;
  logDebug(1, "Upgrade offerings rerolled", { rerollTokens: this.rerollTokens, choices: this.upgradeManager.activeCards.length });
  return true;
};

const balttatoOriginalSelectUpgradeByIndexProgression = GameManager.prototype.selectUpgradeByIndex;
GameManager.prototype.selectUpgradeByIndex = function(index) {
  return balttatoOriginalSelectUpgradeByIndexProgression.call(this, index);
};

/* TODO 17-18: zoom the camera out so the playing field shows more action at once,
 * and progressively direct more numerous, wider-spread enemy clusters. */

const balttatoOriginalSpawnEnemiesDirector = GameManager.prototype.spawnEnemies;
GameManager.prototype.spawnEnemies = function(dt) {
  this.spawnDirectorTimer = (this.spawnDirectorTimer || 0) + dt;

  const currentInterval = this.activeBoss ? this.spawnInterval * 2.2 : this.spawnInterval;
  if (this.spawnDirectorTimer < currentInterval) return;

  this.spawnDirectorTimer -= currentInterval;

  const elapsed = this.spawnDirectorElapsed || 0;
  const targetCount = Math.min(
    BALTTATO_SPAWN_COUNT_CAP,
    BALTTATO_SPAWN_START_COUNT + Math.floor(elapsed / BALTTATO_SPAWN_COUNT_GROWTH_SECONDS) * BALTTATO_SPAWN_COUNT_STEP
  );

  let normalEnemyCount = 0;
  for (let i = 0; i < this.enemies.length; i++) {
    const enemy = this.enemies[i];
    if (!enemy.isDestroyed && !enemy.isBoss) normalEnemyCount += 1;
  }

  if (normalEnemyCount >= targetCount) return;

  this.spawnTimer = 0;
  const beforeCount = this.enemies.length;
  balttatoOriginalSpawnEnemiesDirector.call(this, currentInterval);

  const spawned = this.enemies.slice(beforeCount);
  const swarmers = spawned.filter((enemy) => !enemy.isDestroyed && enemy.enemyType === "swarmer");

  if (swarmers.length > 0) {
    const baseX = swarmers.reduce((sum, enemy) => sum + enemy.x, 0) / swarmers.length;
    const baseY = swarmers.reduce((sum, enemy) => sum + enemy.y, 0) / swarmers.length;
    const clusterSize = Math.min(
      BALTTATO_SWARMER_CLUSTER_CAP,
      2 + Math.floor(elapsed / 30)
    );
    const spread = Math.min(
      BALTTATO_SWARMER_SPREAD_CAP,
      BALTTATO_SWARMER_SPREAD_BASE + elapsed * BALTTATO_SWARMER_SPREAD_GROWTH
    );

    for (let i = 0; i < swarmers.length; i++) {
      swarmers[i].x = baseX + (Math.random() - 0.5) * spread;
      swarmers[i].y = baseY + (Math.random() - 0.5) * spread;
    }

    const roomForCluster = Math.max(0, targetCount - normalEnemyCount - swarmers.length);
    const additionalCount = Math.min(clusterSize - swarmers.length, roomForCluster);
    for (let i = 0; i < additionalCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * spread * 0.5;
      const swarmerSpeed = this.enemySpeedBase * 1.5 + (Math.random() - 0.5) * 20;
      const swarmerHp = 14 + this.playerLevel * 3;
      const swarmer = new Enemy(
        baseX + Math.cos(angle) * distance,
        baseY + Math.sin(angle) * distance,
        8,
        swarmerSpeed,
        swarmerHp,
        "#ec4899",
        "swarmer"
      );
      this.enemies.push(swarmer);
    }

    logDebug(3, "Progressive swarmer cluster spawned", {
      count: swarmers.length + additionalCount,
      targetCount,
      spread,
      elapsed
    });
  }

  this.spawnDirectorElapsed = elapsed + currentInterval;
};

const balttatoOriginalRestartGameDirector = GameManager.prototype.restartGame;
GameManager.prototype.restartGame = function() {
  balttatoOriginalRestartGameDirector.call(this);
  this.spawnDirectorTimer = 0;
  this.spawnDirectorElapsed = 0;
};
