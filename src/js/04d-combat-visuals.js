(function() {
  const ENEMY_PROJECTILE_RANGE = 420;

  // P-1: Aimed projectile enemies only open fire once the player is close enough.
  // They continue tracking/approaching normally while outside that firing range.
  const OriginalEnemyUpdate = Enemy.prototype.update;
  Enemy.prototype.update = function(dt, targetX, targetY, enemyProjectiles) {
    if (this.enemyType === "shooter") {
      const distanceToPlayer = Math.hypot(targetX - this.x, targetY - this.y);
      if (distanceToPlayer > ENEMY_PROJECTILE_RANGE) {
        const suppressedProjectiles = { push: () => 0 };
        OriginalEnemyUpdate.call(this, dt, targetX, targetY, suppressedProjectiles);
        return;
      }
    }

    OriginalEnemyUpdate.call(this, dt, targetX, targetY, enemyProjectiles);
  };

  // P-1: Bosses can enter from any arena edge instead of always arriving from above.
  const OriginalSpawnBoss = GameManager.prototype.spawnBoss;
  GameManager.prototype.spawnBoss = function() {
    const tier = Math.floor(this.playerLevel / 3);
    const margin = 50;
    const side = Math.floor(Math.random() * 4);
    let spawnX;
    let spawnY;

    switch (side) {
      case 0:
        spawnX = Math.random() * this.width;
        spawnY = -margin;
        break;
      case 1:
        spawnX = this.width + margin;
        spawnY = Math.random() * this.height;
        break;
      case 2:
        spawnX = Math.random() * this.width;
        spawnY = this.height + margin;
        break;
      default:
        spawnX = -margin;
        spawnY = Math.random() * this.height;
        break;
    }

    const boss = new BossEnemy(spawnX, spawnY, tier, this.width, this.height);
    this.bossTier = tier;
    this.enemies.push(boss);
    this.activeBoss = boss;

    logDebug(1, "Boss spawned from randomized arena edge", {
      name: boss.name,
      tier: boss.tier,
      health: boss.health,
      spawnX: spawnX.toFixed(1),
      spawnY: spawnY.toFixed(1),
      side
    });
  };

  // P-1: Aimed boss attacks respect the same sensible engagement range.
  const OriginalBossAimedCluster = BossEnemy.prototype.fireAimedCluster;
  BossEnemy.prototype.fireAimedCluster = function(targetX, targetY, enemyProjectiles) {
    const distanceToPlayer = Math.hypot(targetX - this.x, targetY - this.y);
    if (distanceToPlayer > ENEMY_PROJECTILE_RANGE) {
      logDebug(3, "Boss aimed volley withheld outside projectile engagement range", {
        distance: distanceToPlayer.toFixed(1),
        maxRange: ENEMY_PROJECTILE_RANGE
      });
      return;
    }

    OriginalBossAimedCluster.call(this, targetX, targetY, enemyProjectiles);
  };

  // #7/#20: Normalize enemy bullets to an unmistakable red/pink threat palette,
  // and make higher-damage bullets visibly larger with a warning ring.
  const OriginalEnemyProjectile = EnemyProjectile;
  EnemyProjectile = class extends OriginalEnemyProjectile {
    constructor(x, y, vx, vy, radius = 5, damage = 12, color = "#ef4444") {
      const threatColor = damage >= 15 ? "#fb7185" : "#ef4444";
      const threatRadius = Math.max(radius, 4.5 + damage * 0.12);
      super(x, y, vx, vy, threatRadius, damage, threatColor);
      this.threatLevel = damage >= 15 ? "HIGH" : "STANDARD";
    }

    draw(ctx) {
      ctx.save();

      if (this.threatLevel === "HIGH") {
        const pulse = 1 + Math.sin(Date.now() * 0.012) * 0.12;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.55 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(251, 113, 133, 0.65)";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#fb7185";
        ctx.shadowBlur = 10;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.threatLevel === "HIGH" ? 12 : 8;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }
  };

  // #20: Give each major combat effect a consistent, distinct visual signature.
  const OriginalLightningArc = LightningArc.prototype.draw;
  LightningArc.prototype.draw = function(ctx) {
    const originalColor = this.color;
    this.color = "#a855f7";
    OriginalLightningArc.call(this, ctx);
    this.color = originalColor;
  };

  const OriginalBlastEffect = BlastEffect.prototype.draw;
  BlastEffect.prototype.draw = function(ctx) {
    const originalColor = this.color;
    this.color = "#f59e0b";
    OriginalBlastEffect.call(this, ctx);
    this.color = originalColor;
  };

  const OriginalProjectileDraw = Projectile.prototype.draw;
  Projectile.prototype.draw = function(ctx) {
    const originalColor = this.color;
    if (this.isFragment) this.color = "#fb923c";
    OriginalProjectileDraw.call(this, ctx);
    this.color = originalColor;
  };
})();
