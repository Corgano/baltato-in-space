(function() {
  const statusMeters = document.createElement("div");
  statusMeters.id = "arena-status-meters";
  statusMeters.innerHTML = `
    <div class="arena-meter" id="hudHealthMeterWrap">
      <div class="arena-meter-label"><span>Hull</span><span id="hudHealthText">100%</span></div>
      <div class="arena-meter-track"><div class="arena-meter-fill" id="hudHealthMeter"></div></div>
    </div>
    <div class="arena-meter" id="hudBoostMeterWrap">
      <div class="arena-meter-label"><span>Boost</span><span id="hudBoostText">0%</span></div>
      <div class="arena-meter-track"><div class="arena-meter-fill" id="hudBoostMeter"></div></div>
    </div>
  `;
  const canvasContainer = document.getElementById("canvas-container");
  if (canvasContainer) canvasContainer.appendChild(statusMeters);

  const hudStyle = document.createElement("style");
  hudStyle.textContent = `
    #arena-status-meters {
      position: absolute;
      left: 12px;
      top: 12px;
      z-index: 5;
      width: 180px;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .arena-meter {
      margin-bottom: 7px;
      display: none;
    }
    .arena-meter-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      color: #cbd5e1;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-shadow: 0 1px 2px #000;
    }
    .arena-meter-track {
      height: 8px;
      overflow: hidden;
      border: 1px solid rgba(148, 163, 184, 0.55);
      border-radius: 3px;
      background: rgba(15, 23, 42, 0.82);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    }
    .arena-meter-fill {
      height: 100%;
      width: 100%;
      transition: width 80ms linear;
    }
    #hudHealthMeter { background: #ef4444; }
    #hudBoostMeter { background: #38bdf8; }
    @media (max-width: 700px) {
      #arena-status-meters { width: 145px; }
    }
  `;
  document.head.appendChild(hudStyle);

  const OriginalPlayer = Player;
  Player = class extends OriginalPlayer {
    constructor(x, y) {
      super(x, y);
      this.boostCapacity = 0;
      this.boost = 0;
    }

    reset(startX, startY) {
      super.reset(startX, startY);
      this.boostCapacity = 0;
      this.boost = 0;
    }

    update(dt, activeKeys, arenaWidth, arenaHeight) {
      const moving = activeKeys.has("KeyW") || activeKeys.has("KeyA") || activeKeys.has("KeyS") || activeKeys.has("KeyD") ||
        activeKeys.has("ArrowUp") || activeKeys.has("ArrowDown") || activeKeys.has("ArrowLeft") || activeKeys.has("ArrowRight");
      const boosting = moving && (activeKeys.has("ShiftLeft") || activeKeys.has("ShiftRight"));
      const canBoost = boosting && this.boost > 0;
      const normalSpeed = this.speed;

      if (canBoost) this.speed = normalSpeed * 2;

      super.update(dt, activeKeys, arenaWidth, arenaHeight);
      this.speed = normalSpeed;

      if (canBoost) this.boost = Math.max(0, this.boost - 45 * dt);
    }
  };

  const OriginalUpgradeManager = UpgradeManager;
  UpgradeManager = class extends OriginalUpgradeManager {
    constructor() {
      super();
      this.upgradeCatalog.push({
        id: "boost_capacity",
        title: "BOOST CAPACITOR",
        tierName: "UNCOMMON",
        rarityColor: "#38bdf8",
        description: "Adds +50 boost capacity and fully charges the new capacity",
        apply: (player) => {
          player.boostCapacity += 50;
          player.boost = player.boostCapacity;
          logDebug(1, "Upgrade applied: BOOST CAPACITOR", {
            boostCapacity: player.boostCapacity,
            boost: player.boost
          });
        }
      });
    }
  };

  const OriginalBossUpdate = BossEnemy.prototype.update;
  BossEnemy.prototype.update = function(dt, targetX, targetY, enemyProjectiles) {
    const previousState = this.chargeState;
    OriginalBossUpdate.call(this, dt, targetX, targetY, enemyProjectiles);
    if (previousState === "TRACKING" && this.chargeState === "TELEGRAPH") {
      const distanceToEdge = this.getChargeDistanceToBoundary();
      this.chargeDistance = Math.min(this.dashSpeed * this.dashDuration, distanceToEdge);
    }
  };

  BossEnemy.prototype.getChargeDistanceToBoundary = function() {
    const dx = this.dashUnitX;
    const dy = this.dashUnitY;
    const distances = [];

    if (dx > 0) distances.push((this.arenaWidth - this.radius - this.x) / dx);
    if (dx < 0) distances.push((this.radius - this.x) / dx);
    if (dy > 0) distances.push((this.arenaHeight - this.radius - this.y) / dy);
    if (dy < 0) distances.push((this.radius - this.y) / dy);

    const positiveDistances = distances.filter((distance) => distance >= 0);
    return positiveDistances.length > 0 ? Math.min(...positiveDistances) : 0;
  };

  const OriginalBossDraw = BossEnemy.prototype.draw;
  BossEnemy.prototype.draw = function(ctx) {
    if (this.chargeState === "TELEGRAPH") {
      const chargeDistance = Math.max(0, this.chargeDistance || this.dashSpeed * this.dashDuration);
      const scale = chargeDistance / 700;
      const originalX = this.dashUnitX;
      const originalY = this.dashUnitY;
      this.dashUnitX *= scale;
      this.dashUnitY *= scale;
      try {
        OriginalBossDraw.call(this, ctx);
      } finally {
        this.dashUnitX = originalX;
        this.dashUnitY = originalY;
      }
      return;
    }
    OriginalBossDraw.call(this, ctx);
  };

  const OriginalGameManager = GameManager;
  GameManager = class extends OriginalGameManager {
    constructor(canvas) {
      super(canvas);
      this.hudBoost = document.getElementById("hudBoostMeter");
      this.hudHealth = document.getElementById("hudHealthMeter");
      this.updateBoostHud();
    }

    updateBoostHud() {
      if (!this.hudBoost || !this.hudHealth) return;

      const healthRatio = this.player.maxHealth > 0 ? Math.max(0, this.player.health / this.player.maxHealth) : 0;
      const boostCapacity = Math.max(0, this.player.boostCapacity || 0);
      const boostRatio = boostCapacity > 0 ? Math.max(0, Math.min(1, this.player.boost / boostCapacity)) : 0;

      this.hudHealth.style.width = `${healthRatio * 100}%`;
      this.hudBoost.style.width = `${boostRatio * 100}%`;
      this.hudBoost.parentElement.style.display = boostCapacity > 0 ? "block" : "none";

      const healthText = document.getElementById("hudHealthText");
      const boostText = document.getElementById("hudBoostText");
      if (healthText) healthText.textContent = `${Math.round(healthRatio * 100)}%`;
      if (boostText) boostText.textContent = `${Math.round(boostRatio * 100)}%`;
    }

    updateHUD() {
      super.updateHUD();
      this.updateBoostHud();
    }

    updateEntities(dt) {
      super.updateEntities(dt);
      this.updateBoostHud();
    }
  };
})();
