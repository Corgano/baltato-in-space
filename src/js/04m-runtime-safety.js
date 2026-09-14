/*
 * Runtime rendering safety and version 1.7.9.
 * Prevents malformed entity radii from stopping the animation loop.
 */

const BALTTATO_RUNTIME_VERSION = "1.7.9";

function balttatoSanitizeDrawRadius(value, fallback, label) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) return numeric;

  const safeFallback = Math.max(0, Number(fallback) || 0);
  logDebug(0, "Invalid canvas arc radius corrected", {
    label,
    value,
    fallback: safeFallback
  });
  return safeFallback;
}

const balttatoOriginalPlayerDrawSafety = Player.prototype.draw;
Player.prototype.draw = function(ctx) {
  this.magnetRadius = balttatoSanitizeDrawRadius(this.magnetRadius, 135, "Player.magnetRadius");
  this.weaponRange = balttatoSanitizeDrawRadius(this.weaponRange, 260, "Player.weaponRange");
  return balttatoOriginalPlayerDrawSafety.call(this, ctx);
};

const balttatoOriginalEnemyDrawSafety = Enemy.prototype.draw;
Enemy.prototype.draw = function(ctx) {
  this.radius = balttatoSanitizeDrawRadius(this.radius, 12, "Enemy.radius");
  return balttatoOriginalEnemyDrawSafety.call(this, ctx);
};

const balttatoOriginalBossDrawSafety = BossEnemy.prototype.draw;
BossEnemy.prototype.draw = function(ctx) {
  this.radius = balttatoSanitizeDrawRadius(this.radius, 32, "BossEnemy.radius");
  return balttatoOriginalBossDrawSafety.call(this, ctx);
};

const balttatoOriginalProjectileDrawSafety = Projectile.prototype.draw;
Projectile.prototype.draw = function(ctx) {
  this.radius = balttatoSanitizeDrawRadius(this.radius, 4.5, "Projectile.radius");
  return balttatoOriginalProjectileDrawSafety.call(this, ctx);
};

const balttatoOriginalEnemyProjectileDrawSafety = EnemyProjectile.prototype.draw;
EnemyProjectile.prototype.draw = function(ctx) {
  this.radius = balttatoSanitizeDrawRadius(this.radius, 5, "EnemyProjectile.radius");
  return balttatoOriginalEnemyProjectileDrawSafety.call(this, ctx);
};

const balttatoOriginalBlastEffectDrawSafety = BlastEffect.prototype.draw;
BlastEffect.prototype.draw = function(ctx) {
  this.maxRadius = balttatoSanitizeDrawRadius(this.maxRadius, 45, "BlastEffect.maxRadius");
  return balttatoOriginalBlastEffectDrawSafety.call(this, ctx);
};

logDebug(1, "Runtime rendering safety initialized", { version: BALTTATO_RUNTIME_VERSION });
