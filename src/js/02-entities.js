class Player {
      /**
       * Constructs the Player instance with default starting stats.
       *
       * How to call:
       *   const player = new Player(400, 300);
       *
       * @param {number} x - Starting horizontal coordinate.
       * @param {number} y - Starting vertical coordinate.
       */
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 16;
        this.speed = 220; // Movement speed in pixels/sec
        this.maxHealth = 100;
        this.health = 100;
        this.color = "#38bdf8";

        // Defensive properties
        this.armor = 0; // Flat damage mitigation
        this.invulnerableTimer = 0.0;
        this.invulnerableDuration = 0.6; // Seconds of grace after taking damage

        // Auto-combat weapon attributes
        this.fireInterval = 0.55; // Fires every 550ms base
        this.damage = 32; // Base projectile kinetic damage
        this.projectileSpeed = BASE_PROJECTILE_SPEED; // Projectile speed in pixels/sec (340)
        this.weaponRange = 260; // Maximum targeting acquisition and projectile flight range in pixels
        this.multishotCount = 1; // Number of projectiles fired per cycle
        this.pierceCount = 0; // Number of enemies projectiles can pierce through
        this.critChance = 0.08; // Base 8% critical strike chance
        this.critMultiplier = 2.0;

        // Augmentation mechanics (Chained Hits, Ricochet, AoE blast, Life leech)
        this.chainHits = 0; // Electric lightning bounces to nearby enemies
        this.chainRange = 180; // Chain acquisition radius in pixels
        this.ricochetCount = 0; // Bounces off arena perimeter walls
        this.hasExplosiveBlast = false; // Area-of-effect blast on impact
        this.blastRadius = 45; // Blast radius in pixels
        this.lifeLeechChance = 0.0; // Chance on enemy kill to restore HP
        this.fragmentation = 0; // Number of kinetic fragmentation shards spawned on final impact
        this.luck = 0; // Starts at 0 luck; Lucky Charm increments by +1 with diminishing returns
        this.hasSnailMailJoker = false; // Balatro Joker: Starts at 1/3 speed, accelerates, damage scales with speed
        this.hasSuperpositionJoker = false; // Balatro Joker: Spawns quantum paired bullets with 50/50 measurement collapse

        // Resource collection attributes
        this.magnetRadius = 135; // Suction distance for dropped XP squares

        // Active upgrades inventory tracking
        this.acquiredUpgrades = [];
        this.acquiredJokers = []; // List of active Balatro Joker objects

        // Visual heading and engine pulse
        this.facingAngle = 0;
        this.enginePulse = 0;

        logDebug(1, "Player instance created successfully", {
          x: this.x,
          y: this.y,
          maxHealth: this.maxHealth,
          speed: this.speed,
          fireInterval: this.fireInterval,
          damage: this.damage,
          projectileSpeed: this.projectileSpeed,
          luck: this.luck
        });
      }

      /**
       * Resets the player instance to default parameters following Game Over.
       *
       * How to call:
       *   player.reset(400, 300);
       *
       * @param {number} startX - Target X coordinate.
       * @param {number} startY - Target Y coordinate.
       * @returns {void}
       */
      reset(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.maxHealth = 100;
        this.health = 100;
        this.speed = 220;
        this.armor = 0;
        this.invulnerableTimer = 0.0;
        this.fireInterval = 0.55;
        this.damage = 32;
        this.projectileSpeed = BASE_PROJECTILE_SPEED;
        this.weaponRange = 260;
        this.multishotCount = 1;
        this.pierceCount = 0;
        this.critChance = 0.08;
        this.critMultiplier = 2.0;
        this.chainHits = 0;
        this.chainRange = 180;
        this.ricochetCount = 0;
        this.hasExplosiveBlast = false;
        this.blastRadius = 45;
        this.lifeLeechChance = 0.0;
        this.fragmentation = 0;
        this.luck = 0;
        this.hasSnailMailJoker = false;
        this.hasSuperpositionJoker = false;
        this.magnetRadius = 135;
        this.acquiredUpgrades = [];
        this.acquiredJokers = [];
        this.facingAngle = 0;

        logDebug(1, "Player parameters reset to baseline configuration");
      }

      /**
       * Updates player position based on active WASD keys and constrains
       * coordinates strictly within canvas arena limits.
       *
       * How to call:
       *   player.update(dt, activeKeysSet, 800, 600);
       *
       * @param {number} dt - Frame delta time in seconds.
       * @param {Set<string>} activeKeys - Active keyboard key codes.
       * @param {number} arenaWidth - Logical width of arena.
       * @param {number} arenaHeight - Logical height of arena.
       * @returns {void}
       */
      update(dt, activeKeys, arenaWidth, arenaHeight) {
        let moveX = 0;
        let moveY = 0;

        // WASD & Arrow Keys mapping
        if (activeKeys.has("KeyW") || activeKeys.has("ArrowUp")) moveY -= 1;
        if (activeKeys.has("KeyS") || activeKeys.has("ArrowDown")) moveY += 1;
        if (activeKeys.has("KeyA") || activeKeys.has("ArrowLeft")) moveX -= 1;
        if (activeKeys.has("KeyD") || activeKeys.has("ArrowRight")) moveX += 1;

        // Vector normalization for diagonal movement
        if (moveX !== 0 || moveY !== 0) {
          const length = Math.hypot(moveX, moveY);
          const normalizedX = moveX / length;
          const normalizedY = moveY / length;

          this.x += normalizedX * this.speed * dt;
          this.y += normalizedY * this.speed * dt;

          this.facingAngle = Math.atan2(normalizedY, normalizedX);
          this.enginePulse += dt * 14;

          logDebug(4, "Player movement vector computed", {
            moveX: normalizedX.toFixed(2),
            moveY: normalizedY.toFixed(2),
            currentX: this.x.toFixed(1),
            currentY: this.y.toFixed(1)
          });
        }

        // Keep player strictly constrained within arena bounds
        this.x = Math.max(this.radius, Math.min(arenaWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(arenaHeight - this.radius, this.y));

        // Advance invulnerability cooldown
        if (this.invulnerableTimer > 0) {
          this.invulnerableTimer -= dt;
          if (this.invulnerableTimer < 0) this.invulnerableTimer = 0;
        }
      }

      /**
       * Inflicts damage onto the player taking armor and invulnerability into account.
       *
       * How to call:
       *   const damaged = player.takeDamage(15);
       *
       * @param {number} amount - Raw incoming damage.
       * @returns {boolean} True if damage was successfully sustained.
       */
      takeDamage(amount) {
        if (this.invulnerableTimer > 0) {
          logDebug(3, "Player hit avoided via active invulnerability window");
          return false;
        }

        const effectiveDamage = Math.max(1, amount - this.armor);
        this.health -= effectiveDamage;
        if (this.health < 0) this.health = 0;

        this.invulnerableTimer = this.invulnerableDuration;

        logDebug(1, "Player sustained damage", {
          rawDamage: amount,
          mitigatedByArmor: this.armor,
          actualDamage: effectiveDamage,
          remainingHealth: this.health
        });

        return true;
      }

      /**
       * Heals player hull integrity up to the maximum capacity.
       *
       * How to call:
       *   player.heal(25);
       *
       * @param {number} amount - Health units restored.
       * @returns {void}
       */
      heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        logDebug(2, "Player hull repaired", { amount, currentHp: this.health, maxHp: this.maxHealth });
      }

      /**
       * Renders player hull, engine exhaust glow, and shield indicators.
       *
       * How to call:
       *   player.draw(ctx);
       *
       * @param {CanvasRenderingContext2D} ctx - Active 2D canvas context.
       * @returns {void}
       */
      draw(ctx) {
        // Blink visual during invulnerability grace period
        if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 20) % 2 === 0) {
          return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Suction field indicator ring (subtle)
        ctx.beginPath();
        ctx.arc(0, 0, this.magnetRadius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Weapon engagement range indicator ring (subtle, tactical dashed perimeter)
        ctx.beginPath();
        ctx.setLineDash([3, 7]);
        ctx.arc(0, 0, this.weaponRange, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(251, 191, 36, 0.12)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.rotate(this.facingAngle);

        // Kinetic Thruster Flame
        const flameOffset = Math.sin(this.enginePulse) * 3;
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.8, -this.radius * 0.35);
        ctx.lineTo(-this.radius * 1.5 + flameOffset, 0);
        ctx.lineTo(-this.radius * 0.8, this.radius * 0.35);
        ctx.fillStyle = "#f59e0b";
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 8;
        ctx.fill();

        // Hull Body - Sleek geometric combat interceptor
        ctx.beginPath();
        ctx.moveTo(this.radius * 1.25, 0);
        ctx.lineTo(-this.radius * 0.85, -this.radius * 0.9);
        ctx.lineTo(-this.radius * 0.45, 0);
        ctx.lineTo(-this.radius * 0.85, this.radius * 0.9);
        ctx.closePath();

        ctx.fillStyle = "#0284c7";
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Cockpit Core
        ctx.beginPath();
        ctx.arc(this.radius * 0.15, 0, this.radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = "#e0f2fe";
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 4;
        ctx.fill();

        ctx.restore();
      }
    }

    /**
     * =========================================================================
     * Class: Enemy
     * =========================================================================
     * Standard hostile entity spawned around arena perimeter.
     * Moves directly toward the player's position using Euclidean vector math.
     * =========================================================================
     */
    class Enemy {
      /**
       * Constructs a new Enemy instance with archetype attributes.
       *
       * How to call:
       *   const chaser = new Enemy(x, y, 12, 90, 30, "#f43f5e", "chaser");
       *   const swarmer = new Enemy(x, y, 8, 145, 16, "#ec4899", "swarmer");
       *   const shooter = new Enemy(x, y, 14, 65, 48, "#a855f7", "shooter");
       *   const heavy = new Enemy(x, y, 20, 52, 130, "#f97316", "heavy");
       *
       * @param {number} x - Horizontal coordinate.
       * @param {number} y - Vertical coordinate.
       * @param {number} radius - Collision radius.
       * @param {number} speed - Tracking velocity in pixels/sec.
       * @param {number} health - Maximum hit points.
       * @param {string} color - Primary accent render color.
       * @param {string} enemyType - Archetype: "chaser", "swarmer", "shooter", "heavy", or "boss".
       */
      constructor(x, y, radius = 12, speed = 90, health = 30, color = "#f43f5e", enemyType = "chaser") {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.speed = speed;
        this.maxHealth = health;
        this.health = health;
        this.color = color;
        this.enemyType = enemyType;
        this.isDestroyed = false;
        this.isBoss = false;
        this.hasDroppedLoot = false;

        // Visual rotation and hit-flash indicator
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 3;
        this.hitFlashTimer = 0.0;

        // Ranged shooter tactical combat timers
        this.fireInterval = 2.4;
        this.fireTimer = 0.8 + Math.random() * 1.5;

        logDebug(3, "Enemy initialized", {
          type: this.enemyType,
          spawnX: x.toFixed(1),
          spawnY: y.toFixed(1),
          speed: speed.toFixed(1),
          health
        });
      }

      /**
       * Advances enemy position directly toward target coordinates using unit vectors.
       * Shooters orbit at tactical distance and periodically fire plasma bolts.
       *
       * How to call:
       *   enemy.update(dt, player.x, player.y, enemyProjectiles);
       *
       * @param {number} dt - Frame delta time in seconds.
       * @param {number} targetX - Player horizontal position.
       * @param {number} targetY - Player vertical position.
       * @param {EnemyProjectile[]} [enemyProjectiles] - Array to push fired hostile bullets into.
       * @returns {void}
       */
      update(dt, targetX, targetY, enemyProjectiles) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
          const unitX = dx / dist;
          const unitY = dy / dist;

          if (this.enemyType === "shooter") {
            // Tactical standoff: approach if far, backpedal if too close, orbit tangentially when in sweet spot
            const idealDist = 240;
            if (dist > idealDist + 45) {
              this.x += unitX * this.speed * dt;
              this.y += unitY * this.speed * dt;
            } else if (dist < idealDist - 45) {
              this.x -= unitX * (this.speed * 0.75) * dt;
              this.y -= unitY * (this.speed * 0.75) * dt;
            } else {
              // Lateral orbit strafe
              this.x += -unitY * (this.speed * 0.85) * dt;
              this.y += unitX * (this.speed * 0.85) * dt;
            }

            // Periodically fire aiming plasma bolt at player
            this.fireTimer -= dt;
            if (this.fireTimer <= 0 && enemyProjectiles) {
              this.fireTimer = this.fireInterval;
              const bSpeed = 230;
              const bvx = unitX * bSpeed;
              const bvy = unitY * bSpeed;
              enemyProjectiles.push(new EnemyProjectile(this.x, this.y, bvx, bvy, 5, 12, "#c084fc"));
              logDebug(3, "Shooter enemy discharged plasma bolt", { x: this.x.toFixed(1), y: this.y.toFixed(1) });
            }
          } else {
            // Direct pursuit vector (chaser, swarmer, heavy)
            this.x += unitX * this.speed * dt;
            this.y += unitY * this.speed * dt;
          }
        }

        this.rotation += this.rotationSpeed * dt;

        if (this.hitFlashTimer > 0) {
          this.hitFlashTimer -= dt;
          if (this.hitFlashTimer < 0) this.hitFlashTimer = 0;
        }
      }

      /**
       * Inflicts damage onto enemy and triggers visual flash.
       * Returns boolean indicating if damage brought enemy health to zero.
       *
       * How to call:
       *   const killed = enemy.takeDamage(25);
       *
       * @param {number} amount - Damage sustained.
       * @returns {boolean} True if enemy health reaches zero (killed).
       */
      takeDamage(amount) {
        this.health -= amount;
        this.hitFlashTimer = 0.1;

        logDebug(3, "Enemy took damage", {
          damageReceived: amount,
          remainingHealth: this.health
        });

        if (this.health <= 0) {
          logDebug(2, "Enemy neutralized", { isBoss: this.isBoss, type: this.enemyType });
          return true;
        }
        return false;
      }

      /**
       * Renders enemy geometry and overhead health bar.
       *
       * How to call:
       *   enemy.draw(ctx);
       *
       * @param {CanvasRenderingContext2D} ctx - Active 2D canvas context.
       * @returns {void}
       */
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.fillStyle = this.hitFlashTimer > 0 ? "#ffffff" : "#1e1b4b";
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;

        if (this.enemyType === "swarmer") {
          // Agile dart delta-wing geometry
          ctx.beginPath();
          ctx.moveTo(this.radius * 1.3, 0);
          ctx.lineTo(-this.radius, this.radius * 0.8);
          ctx.lineTo(-this.radius * 0.4, 0);
          ctx.lineTo(-this.radius, -this.radius * 0.8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (this.enemyType === "shooter") {
          // Octagonal combat turret with central aiming optic barrel
          const sides = 8;
          ctx.beginPath();
          for (let s = 0; s < sides; s++) {
            const angle = (s * Math.PI * 2) / sides;
            const sx = Math.cos(angle) * this.radius;
            const sy = Math.sin(angle) * this.radius;
            if (s === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Barrel needle
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(this.radius * 1.35, 0);
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#c084fc";
          ctx.stroke();

          // Glowing optic nucleus
          ctx.beginPath();
          ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = "#e9d5ff";
          ctx.fill();
        } else if (this.enemyType === "heavy") {
          // Heavy armored fortress hexagon
          const sides = 6;
          ctx.beginPath();
          for (let s = 0; s < sides; s++) {
            const angle = (s * Math.PI * 2) / sides;
            const sx = Math.cos(angle) * this.radius;
            const sy = Math.sin(angle) * this.radius;
            if (s === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.stroke();

          // Heavy reinforced inner plating
          ctx.beginPath();
          for (let s = 0; s < sides; s++) {
            const angle = (s * Math.PI * 2) / sides;
            const sx = Math.cos(angle) * (this.radius * 0.55);
            const sy = Math.sin(angle) * (this.radius * 0.55);
            if (s === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          ctx.strokeStyle = "#fed7aa";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          // Standard diamond hostile drone geometry
          ctx.beginPath();
          ctx.moveTo(this.radius, 0);
          ctx.lineTo(0, this.radius * 0.75);
          ctx.lineTo(-this.radius, 0);
          ctx.lineTo(0, -this.radius * 0.75);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Glowing hostile optic center
          ctx.beginPath();
          ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = this.color;
          ctx.fill();
        }

        ctx.restore();

        // Mini overhead health indicator
        if (this.health < this.maxHealth) {
          const barW = this.radius * 2;
          const barH = 3;
          const barX = this.x - barW / 2;
          const barY = this.y - this.radius - 6;

          ctx.save();
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(barX, barY, barW, barH);
          const healthRatio = Math.max(0, this.health / this.maxHealth);
          ctx.fillStyle = this.color;
          ctx.fillRect(barX, barY, barW * healthRatio, barH);
          ctx.restore();
        }
      }
    }

    /**
     * =========================================================================
     * Class: BossEnemy
     * =========================================================================
     * Escalating elite boss encounter spawned at regular sector intervals:
     * - Radial bullet hell ring bursts
     * - Aimed triple-plasma spreads
     * - Kinetic charge dash with telegraph laser warning
     * - Below 40% health enrage mechanism
     * =========================================================================
     */
    class BossEnemy extends Enemy {
      /**
       * Constructs an escalating Boss enemy instance.
       *
       * How to call:
       *   const boss = new BossEnemy(x, y, tier, arenaWidth, arenaHeight);
       *
       * @param {number} x - Horizontal coordinate.
       * @param {number} y - Vertical coordinate.
       * @param {number} tier - Escalation tier index (1, 2, 3...).
       * @param {number} arenaWidth - Arena width.
       * @param {number} arenaHeight - Arena height.
       */
      constructor(x, y, tier = 1, arenaWidth = 800, arenaHeight = 600) {
        const radius = 32 + Math.min(10, tier * 2);
        const speed = 70 + tier * 8;
        const maxHp = 500 + tier * 380;
        super(x, y, radius, speed, maxHp, "#ec4899", "boss");

        this.isBoss = true;
        this.tier = tier;
        this.arenaWidth = arenaWidth;
        this.arenaHeight = arenaHeight;

        const bossNames = [
          "VANGUARD CRUSHER",
          "PULSE OVERLORD",
          "DREAD BEHEMOTH",
          "APEX ANNIHILATOR",
          "VOID COLOSSUS"
        ];
        this.name = bossNames[(tier - 1) % bossNames.length] + ` [TIER ${tier}]`;

        // Boss attack intervals
        this.radialBurstCooldown = Math.max(2.4, 4.0 - tier * 0.3);
        this.radialBurstTimer = 1.0;

        this.aimedBurstCooldown = Math.max(1.5, 2.8 - tier * 0.2);
        this.aimedBurstTimer = 0.5;

        // Kinetic Charge state machine: 'TRACKING' -> 'TELEGRAPH' -> 'DASHING'
        this.chargeCooldown = Math.max(5.0, 8.0 - tier * 0.5);
        this.chargeTimer = 3.5;
        this.chargeState = "TRACKING";
        this.telegraphTimer = 0;
        this.telegraphDuration = 1.1;
        this.dashTimer = 0;
        this.dashDuration = 0.45;
        this.dashUnitX = 0;
        this.dashUnitY = 0;
        this.dashSpeed = 390 + tier * 30;

        this.isEnraged = false;

        logDebug(1, "Escalating Boss entity constructed", {
          name: this.name,
          tier: this.tier,
          maxHealth: this.maxHealth,
          radius: this.radius
        });
      }

      /**
       * Updates boss state machine, charge phases, projectile attacks,
       * and tracks player position.
       *
       * How to call:
       *   boss.update(dt, player.x, player.y, enemyProjectilesList);
       *
       * @param {number} dt - Frame delta time in seconds.
       * @param {number} targetX - Player X coordinate.
       * @param {number} targetY - Player Y coordinate.
       * @param {Array<EnemyProjectile>} enemyProjectiles - Projectile collection.
       * @returns {void}
       */
      update(dt, targetX, targetY, enemyProjectiles) {
        // Enrage trigger below 40% health
        if (!this.isEnraged && this.health <= this.maxHealth * 0.4) {
          this.isEnraged = true;
          this.speed *= 1.35;
          this.color = "#ef4444";
          logDebug(1, "Boss enrage triggered! Attack speed and velocities elevated", {
            remainingHp: this.health,
            newSpeed: this.speed
          });
        }

        const enrageMultiplier = this.isEnraged ? 1.4 : 1.0;

        // Charge State Machine
        if (this.chargeState === "TRACKING") {
          const dx = targetX - this.x;
          const dy = targetY - this.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 0) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
          }

          this.chargeTimer += dt * enrageMultiplier;
          if (this.chargeTimer >= this.chargeCooldown) {
            this.chargeTimer = 0;
            this.chargeState = "TELEGRAPH";
            this.telegraphTimer = 0;

            const cDx = targetX - this.x;
            const cDy = targetY - this.y;
            const cDist = Math.hypot(cDx, cDy);
            this.dashUnitX = cDist > 0 ? cDx / cDist : 1;
            this.dashUnitY = cDist > 0 ? cDy / cDist : 0;

            logDebug(2, "Boss begins kinetic charge telegraph", { targetX, targetY });
          }
        } else if (this.chargeState === "TELEGRAPH") {
          this.telegraphTimer += dt;
          if (this.telegraphTimer >= this.telegraphDuration) {
            this.chargeState = "DASHING";
            this.dashTimer = 0;
            logDebug(2, "Boss executes kinetic dash");
          }
        } else if (this.chargeState === "DASHING") {
          this.x += this.dashUnitX * this.dashSpeed * dt;
          this.y += this.dashUnitY * this.dashSpeed * dt;
          this.dashTimer += dt;

          if (this.dashTimer >= this.dashDuration) {
            this.chargeState = "TRACKING";
            logDebug(2, "Boss kinetic dash completed");
          }
        }

        // Arena boundary containment
        this.x = Math.max(this.radius, Math.min(this.arenaWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(this.arenaHeight - this.radius, this.y));

        // Radial Bullet Hell attack cycle
        this.radialBurstTimer += dt * enrageMultiplier;
        if (this.radialBurstTimer >= this.radialBurstCooldown) {
          this.radialBurstTimer = 0;
          this.fireRadialBurst(enemyProjectiles);
        }

        // Aimed plasma spread attack cycle
        this.aimedBurstTimer += dt * enrageMultiplier;
        if (this.aimedBurstTimer >= this.aimedBurstCooldown) {
          this.aimedBurstTimer = 0;
          this.fireAimedCluster(targetX, targetY, enemyProjectiles);
        }

        this.rotation += (this.isEnraged ? 2.5 : 1.2) * dt;

        if (this.hitFlashTimer > 0) {
          this.hitFlashTimer -= dt;
          if (this.hitFlashTimer < 0) this.hitFlashTimer = 0;
        }
      }

      /**
       * Dispatches a radial ring of hazardous projectiles across 360 degrees.
       *
       * How to call:
       *   boss.fireRadialBurst(enemyProjectiles);
       *
       * @param {Array<EnemyProjectile>} enemyProjectiles - Array to populate.
       * @returns {void}
       */
      fireRadialBurst(enemyProjectiles) {
        const bulletCount = 10 + Math.min(8, this.tier * 2);
        const bulletSpeed = 160 + this.tier * 15;
        const angleStep = (Math.PI * 2) / bulletCount;
        const offset = Math.random() * Math.PI;

        for (let i = 0; i < bulletCount; i++) {
          const angle = i * angleStep + offset;
          const vx = Math.cos(angle) * bulletSpeed;
          const vy = Math.sin(angle) * bulletSpeed;
          const bullet = new EnemyProjectile(this.x, this.y, vx, vy, 5, 12, "#ec4899");
          enemyProjectiles.push(bullet);
        }

        logDebug(2, "Boss emitted radial burst", { bulletCount });
      }

      /**
       * Dispatches a 3-way spread of aimed plasma bolts toward the player.
       *
       * How to call:
       *   boss.fireAimedCluster(playerX, playerY, enemyProjectiles);
       *
       * @param {number} targetX - Player X coordinate.
       * @param {number} targetY - Player Y coordinate.
       * @param {Array<EnemyProjectile>} enemyProjectiles - Array to populate.
       * @returns {void}
       */
      fireAimedCluster(targetX, targetY, enemyProjectiles) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const baseAngle = Math.atan2(dy, dx);
        const spreadAngles = [-0.22, 0, 0.22];
        const bulletSpeed = 220 + this.tier * 20;

        for (let i = 0; i < spreadAngles.length; i++) {
          const angle = baseAngle + spreadAngles[i];
          const vx = Math.cos(angle) * bulletSpeed;
          const vy = Math.sin(angle) * bulletSpeed;
          const bullet = new EnemyProjectile(this.x, this.y, vx, vy, 5.5, 15, "#f43f5e");
          enemyProjectiles.push(bullet);
        }

        logDebug(3, "Boss dispatched aimed plasma cluster");
      }

      /**
       * Renders boss entity, telegraph laser, and overhead health bar.
       *
       * How to call:
       *   boss.draw(ctx);
       *
       * @param {CanvasRenderingContext2D} ctx - Active 2D canvas context.
       * @returns {void}
       */
      draw(ctx) {
        // Telegraph warning laser
        if (this.chargeState === "TELEGRAPH") {
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([8, 6]);
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x + this.dashUnitX * 700, this.y + this.dashUnitY * 700);
          ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
          ctx.lineWidth = 3;
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Outer ambient aura
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = this.isEnraged ? "rgba(239, 68, 68, 0.7)" : "rgba(236, 72, 153, 0.4)";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.rotate(this.rotation);

        // Faceted octagonal boss fortress shell
        const points = 8;
        ctx.beginPath();
        for (let i = 0; i < points; i++) {
          const a = (i * Math.PI * 2) / points;
          const r = i % 2 === 0 ? this.radius : this.radius * 0.82;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        ctx.fillStyle = this.hitFlashTimer > 0 ? "#ffffff" : "#1e1022";
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 14;
        ctx.stroke();

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.restore();

        // Overhead health bar
        const barW = this.radius * 2.2;
        const barH = 5;
        const barX = this.x - barW / 2;
        const barY = this.y - this.radius - 14;

        ctx.save();
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(barX, barY, barW, barH);
        const healthRatio = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = this.isEnraged ? "#ef4444" : "#ec4899";
        ctx.fillRect(barX, barY, barW * healthRatio, barH);
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);
        ctx.restore();
      }
    }

    /**
     * =========================================================================
     * Class: Projectile
     * =========================================================================
     * Represents a projectile dispatched by the player's weapon systems.
     * Supports speed, damage, critical hits, and piercing through hostiles.
     * =========================================================================
     */
    class Projectile {
      /**
       * Constructs a new Projectile instance.
       *
       * How to call:
       *   const proj = new Projectile(x, y, vx, vy, 4.5, 32, 0, "#fbbf24", false, 1, false, 45, 0);
       *
       * @param {number} x - Origin horizontal coordinate.
       * @param {number} y - Origin vertical coordinate.
       * @param {number} vx - Horizontal velocity in pixels/sec.
       * @param {number} vy - Vertical velocity in pixels/sec.
       * @param {number} radius - Collision radius.
       * @param {number} damage - Damage applied on impact.
       * @param {number} pierceRemaining - Number of additional pierce hits.
       * @param {string} color - Render color.
       * @param {boolean} isCrit - Whether this is a critical strike.
       * @param {number} chainRemaining - Remaining chained hit lightning arcs.
       * @param {boolean} hasExplosion - Whether detonation creates an AoE blast.
       * @param {number} blastRadius - AoE detonation blast radius.
       * @param {number} ricochetRemaining - Remaining boundary ricochet bounces.
       * @param {number} maxRange - Maximum flight distance before projectile expires.
       */
      constructor(
        x,
        y,
        vx,
        vy,
        radius = 4.5,
        damage = 32,
        pierceRemaining = 0,
        color = "#fbbf24",
        isCrit = false,
        chainRemaining = 0,
        hasExplosion = false,
        blastRadius = 45,
        ricochetRemaining = 0,
        maxRange = 260
      ) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = isCrit ? radius * 1.3 : radius;
        this.damage = damage;
        this.pierceRemaining = pierceRemaining;
        this.color = isCrit ? "#f59e0b" : color;
        this.isCrit = isCrit;
        this.chainRemaining = chainRemaining;
        this.hasExplosion = hasExplosion;
        this.blastRadius = blastRadius;
        this.ricochetRemaining = ricochetRemaining;
        this.maxRange = maxRange;
        this.distanceTraveled = 0;
        this.isDestroyed = false;
        this.hitEntities = new Set();

        // Fragmentation and Balatro Joker augmentation properties
        this.isFragment = false; // Whether this projectile is a kinetic shrapnel shard
        this.hasSnailMail = false; // Snail Mail acceleration mechanic
        this.snailAcc = 480; // Acceleration in pixels/sec^2
        this.snailMaxSpeed = 1400; // Terminal accelerated speed
        this.superpositionPairId = null; // ID of quantum entangled twin pair
        this.twin = null; // Pointer to entangled twin projectile
        this.superpositionResolved = false; // Whether the quantum measurement has already collapsed
      }

      /**
       * Advances projectile coordinates by velocity vector scaled by dt, tracks distance traveled,
       * checks boundary ricochet reflections, and expires when max weapon range is reached.
       *
       * How to call:
       *   proj.update(dt, 800, 600);
       *
       * @param {number} dt - Frame delta time in seconds.
       * @param {number} arenaWidth - Logical width of arena.
       * @param {number} arenaHeight - Logical height of arena.
       * @returns {void}
       */
      update(dt, arenaWidth = 800, arenaHeight = 600) {
        // Snail Mail acceleration mechanics: starts slow, accelerates over time
        if (this.hasSnailMail) {
          const currentSpeed = Math.hypot(this.vx, this.vy);
          if (currentSpeed > 0 && currentSpeed < this.snailMaxSpeed) {
            const nextSpeed = Math.min(this.snailMaxSpeed, currentSpeed + this.snailAcc * dt);
            this.vx = (this.vx / currentSpeed) * nextSpeed;
            this.vy = (this.vy / currentSpeed) * nextSpeed;
          }
        }

        const stepX = this.vx * dt;
        const stepY = this.vy * dt;
        this.x += stepX;
        this.y += stepY;
        this.distanceTraveled += Math.hypot(stepX, stepY);

        // Terminate projectile flight once maximum weapon range threshold is crossed
        if (this.distanceTraveled >= this.maxRange) {
          this.isDestroyed = true;
          logDebug(4, "Projectile expired upon reaching maximum range", {
            distanceTraveled: this.distanceTraveled.toFixed(1),
            maxRange: this.maxRange
          });
          return;
        }

        // Execute kinetic ricochet bounce if projectile carries ricochet charges
        if (this.ricochetRemaining > 0) {
          let bounced = false;
          if (this.x <= this.radius && this.vx < 0) {
            this.x = this.radius;
            this.vx = -this.vx;
            this.ricochetRemaining -= 1;
            bounced = true;
            logDebug(3, "Projectile ricochet off left boundary", { remaining: this.ricochetRemaining });
          } else if (this.x >= arenaWidth - this.radius && this.vx > 0) {
            this.x = arenaWidth - this.radius;
            this.vx = -this.vx;
            this.ricochetRemaining -= 1;
            bounced = true;
            logDebug(3, "Projectile ricochet off right boundary", { remaining: this.ricochetRemaining });
          }

          if (this.y <= this.radius && this.vy < 0) {
            this.y = this.radius;
            this.vy = -this.vy;
            this.ricochetRemaining -= 1;
            bounced = true;
            logDebug(3, "Projectile ricochet off top boundary", { remaining: this.ricochetRemaining });
          } else if (this.y >= arenaHeight - this.radius && this.vy > 0) {
            this.y = arenaHeight - this.radius;
            this.vy = -this.vy;
            this.ricochetRemaining -= 1;
            bounced = true;
            logDebug(3, "Projectile ricochet off bottom boundary", { remaining: this.ricochetRemaining });
          }

          if (bounced) {
            // Grant auxiliary flight distance on successful perimeter ricochet
            this.maxRange += 120;
          }
        }
      }

      /**
       * Tests if projectile has traversed beyond arena margin limits.
       *
       * How to call:
       *   if (proj.isOutOfBounds(800, 600)) { ... }
       *
       * @param {number} arenaWidth - Logical width.
       * @param {number} arenaHeight - Logical height.
       * @returns {boolean} True if outside bounds.
       */
      isOutOfBounds(arenaWidth, arenaHeight) {
        const margin = 35;
        return (
          this.x < -margin ||
          this.x > arenaWidth + margin ||
          this.y < -margin ||
          this.y > arenaHeight + margin
        );
      }

      /**
       * Renders projectile core, incandescent head, and distance-based dissipation.
       *
       * How to call:
       *   proj.draw(ctx);
       *
       * @param {CanvasRenderingContext2D} ctx - Canvas context.
       * @returns {void}
       */
      draw(ctx) {
        ctx.save();

        // Smooth dissipation when projectile approaches its terminal range limit
        const rangeRatio = this.distanceTraveled / this.maxRange;
        if (rangeRatio > 0.8) {
          ctx.globalAlpha = Math.max(0.1, 1 - (rangeRatio - 0.8) / 0.2);
        }

        // Snail Mail fiery propulsion trail
        if (this.hasSnailMail) {
          const spd = Math.hypot(this.vx, this.vy);
          const exhaustLen = Math.min(22, (spd / 500) * 14);
          const angle = Math.atan2(this.vy, this.vx);
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x - Math.cos(angle) * exhaustLen, this.y - Math.sin(angle) * exhaustLen);
          ctx.strokeStyle = "#f97316";
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Superposition quantum phase ring
        if (this.superpositionPairId) {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Core projectile body
        ctx.beginPath();
        if (this.isFragment) {
          // Sharp diamond shard silhouette for fragmentation shrapnel
          ctx.moveTo(this.x, this.y - this.radius);
          ctx.lineTo(this.x + this.radius, this.y);
          ctx.lineTo(this.x, this.y + this.radius);
          ctx.lineTo(this.x - this.radius, this.y);
          ctx.closePath();
        } else {
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        }
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.isCrit ? 12 : 6;
        ctx.fill();

        // Inner incandescent core
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();
      }
    }

    /**
     * =========================================================================
     * Class: EnemyProjectile
     * =========================================================================
     * Hazardous projectile fired by Boss entities that travels across the arena
     * and damages the player vessel on collision.
     * =========================================================================
     */
    class EnemyProjectile {
      /**
       * Constructs a new EnemyProjectile instance.
       *
       * How to call:
       *   const eBullet = new EnemyProjectile(x, y, vx, vy, 5, 12, "#ec4899");
       *
       * @param {number} x - Origin X.
       * @param {number} y - Origin Y.
       * @param {number} vx - Horizontal velocity.
       * @param {number} vy - Vertical velocity.
       * @param {number} radius - Collision radius.
       * @param {number} damage - Damage applied on hit.
       * @param {string} color - Render color.
       */
      constructor(x, y, vx, vy, radius = 5, damage = 12, color = "#ec4899") {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.damage = damage;
        this.color = color;
        this.isDestroyed = false;
      }

      /**
       * Advances enemy projectile by its velocity.
       *
       * How to call:
       *   eBullet.update(dt);
       *
       * @param {number} dt - Frame delta time in seconds.
       * @returns {void}
       */
      update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }

      /**
       * Tests if bullet has exited arena bounds.
       *
       * How to call:
       *   if (eBullet.isOutOfBounds(800, 600)) { ... }
       *
       * @param {number} arenaWidth - Logical width.
       * @param {number} arenaHeight - Logical height.
       * @returns {boolean} True if outside bounds.
       */
      isOutOfBounds(arenaWidth, arenaHeight) {
        const margin = 30;
        return (
          this.x < -margin ||
          this.x > arenaWidth + margin ||
          this.y < -margin ||
          this.y > arenaHeight + margin
        );
      }

      /**
       * Renders the hazardous plasma bolt.
       *
       * How to call:
       *   eBullet.draw(ctx);
       *
       * @param {CanvasRenderingContext2D} ctx - Canvas context.
       * @returns {void}
       */
      draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();
      }
    }

    /**
     * =========================================================================
     * Class: LightningArc
     * =========================================================================
     * Renders a vivid electric arc between two coordinate points to visually
     * represent the Chained Hits upgrade in combat.
     * =========================================================================
     */
    class LightningArc {
      /**
       * Constructs a new LightningArc visual entity.
       *
       * How to call:
       *   const arc = new LightningArc(x1, y1, x2, y2, "#38bdf8", 0.22);
       *
       * @param {number} x1 - Source horizontal coordinate.
       * @param {number} y1 - Source vertical coordinate.
       * @param {number} x2 - Target horizontal coordinate.
       * @param {number} y2 - Target vertical coordinate.
       * @param {string} color - Hex or rgba stroke color.
       * @param {number} duration - Lifespan in seconds.
       */
      constructor(x1, y1, x2, y2, color = "#38bdf8", duration = 0.22) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.color = color;
        this.duration = duration;
        this.elapsed = 0.0;
        this.isDestroyed = false;

        // Generate jagged intermediate lightning vertices
        const segments = 5;
        this.points = [{ x: x1, y: y1 }];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const normalX = -dy;
        const normalY = dx;
        const normalLen = Math.hypot(normalX, normalY) || 1;

        for (let i = 1; i < segments; i++) {
          const t = i / segments;
          const jitter = (Math.random() - 0.5) * 22;
          this.points.push({
            x: x1 + dx * t + (normalX / normalLen) * jitter,
            y: y1 + dy * t + (normalY / normalLen) * jitter
          });
        }
        this.points.push({ x: x2, y: y2 });

        logDebug(3, "LightningArc visual spawned", { x1, y1, x2, y2, segments });
      }

      /**
       * Advances the lightning arc timer and marks destroyed when expired.
       *
       * How to call:
       *   arc.update(dt);
       *
       * @param {number} dt - Frame delta time in seconds.
       * @returns {void}
       */
      update(dt) {
        this.elapsed += dt;
        if (this.elapsed >= this.duration) {
          this.isDestroyed = true;
        }
      }

      /**
       * Renders the electric lightning stroke onto the 2D canvas context.
       *
       * How to call:
       *   arc.draw(ctx);
       *
       * @param {CanvasRenderingContext2D} ctx - Canvas rendering context.
       * @returns {void}
       */
      draw(ctx) {
        const alpha = Math.max(0, 1 - this.elapsed / this.duration);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
          ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }
    }

    /**
     * =========================================================================
     * Class: BlastEffect
     * =========================================================================
     * Expanding shockwave ring indicating an area-of-effect detonation.
     * =========================================================================
     */
    class BlastEffect {
      /**
       * Constructs a new BlastEffect visual entity.
       *
       * How to call:
       *   const blast = new BlastEffect(x, y, 45, "#f59e0b", 0.28);
       *
       * @param {number} x - Origin horizontal coordinate.
       * @param {number} y - Origin vertical coordinate.
       * @param {number} maxRadius - Maximum expansion radius in pixels.
       * @param {string} color - Accent stroke color.
       * @param {number} duration - Lifespan in seconds.
       */
      constructor(x, y, maxRadius = 45, color = "#f59e0b", duration = 0.28) {
        this.x = x;
        this.y = y;
        this.maxRadius = maxRadius;
        this.color = color;
        this.duration = duration;
        this.elapsed = 0.0;
        this.isDestroyed = false;

        logDebug(3, "BlastEffect spawned", { x, y, maxRadius });
      }

      /**
       * Advances blast effect expansion.
       *
       * How to call:
       *   blast.update(dt);
       *
       * @param {number} dt - Frame delta time in seconds.
       * @returns {void}
       */
      update(dt) {
        this.elapsed += dt;
        if (this.elapsed >= this.duration) {
          this.isDestroyed = true;
        }
      }

      /**
       * Renders expanding shockwave ring.
       *
       * How to call:
       *   blast.draw(ctx);
       *
       * @param {CanvasRenderingContext2D} ctx - Canvas rendering context.
       * @returns {void}
       */
      draw(ctx) {
        const progress = Math.min(1, this.elapsed / this.duration);
        const radius = progress * this.maxRadius;
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5 * (1 - progress * 0.6);
        ctx.globalAlpha = alpha;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
      }
    }

    /**
     * =========================================================================
     * Class: DroppedItem
     * =========================================================================
     * Represents collectible dropped XP items and high-value Boss Caches.
     * Implements magnetic attraction toward player when within magnet radius.
     * =========================================================================
     */
    class DroppedItem {
      /**
       * Constructs a new DroppedItem (standard XP square, Boss Cache, or decaying Luck Token).
       *
       * How to call:
       *   const item = new DroppedItem(x, y, 12, 10, false, "#34d399");
       *   const luckCrystal = new DroppedItem(x, y, 16, 60, false, "#facc15", true, 60, 12.0);
       *
       * @param {number} x - Horizontal position.
       * @param {number} y - Vertical position.
       * @param {number} size - Visual dimension.
       * @param {number} value - Experience value provided.
       * @param {boolean} isBossCache - Whether this is an elite boss drop.
       * @param {string} color - Accent display color.
       * @param {boolean} isLuckToken - Whether this is a high-value decaying luck crystal.
       * @param {number} initialLuckValue - Starting XP value before decay begins.
       * @param {number} luckDuration - Total seconds before value ticks down to 0.
       */
      constructor(
        x,
        y,
        size = 12,
        value = 10,
        isBossCache = false,
        color = "#34d399",
        isLuckToken = false,
        initialLuckValue = 60,
        luckDuration = 12.0
      ) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.value = value;
        this.isBossCache = isBossCache;
        this.color = color;
        this.isLuckToken = isLuckToken;
        this.initialLuckValue = initialLuckValue;
        this.luckDuration = luckDuration;
        this.luckTimer = luckDuration;
        this.isDestroyed = false;

        this.rotation = Math.random() * Math.PI;
        this.bobOffset = Math.random() * Math.PI * 2;

        logDebug(3, "Dropped item created", {
          x: x.toFixed(1),
          y: y.toFixed(1),
          value: this.value,
          isBossCache: this.isBossCache,
          isLuckToken: this.isLuckToken
        });
      }

      /**
       * Updates item rotation, decays luck token value over time,
       * and pulls it toward the player if inside magnet radius.
       *
       * How to call:
       *   item.update(dt, player.x, player.y, player.magnetRadius);
       *
       * @param {number} dt - Frame delta time.
       * @param {number} playerX - Player X.
       * @param {number} playerY - Player Y.
       * @param {number} magnetRadius - Player suction radius.
       * @returns {void}
       */
      update(dt, playerX, playerY, magnetRadius) {
        this.rotation += (this.isLuckToken ? 3.6 : this.isBossCache ? 3.0 : 1.8) * dt;
        this.bobOffset += dt * 3.5;

        // Decaying Luck Token mechanics: starts high and ticks down toward zero
        if (this.isLuckToken) {
          this.luckTimer -= dt;
          if (this.luckTimer <= 0) {
            this.luckTimer = 0;
            this.value = 0;
            this.isDestroyed = true;
            logDebug(3, "Decaying luck token fully depleted and expired");
            return;
          }
          const progress = Math.max(0, this.luckTimer / this.luckDuration);
          this.value = Math.max(1, Math.ceil(this.initialLuckValue * progress));
        }

        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.hypot(dx, dy);

        // Magnetic suction pull logic
        if (dist < magnetRadius && dist > 0) {
          const pullSpeed = (this.isLuckToken ? 400 : 340) * (1 - dist / magnetRadius) + 140;
          this.x += (dx / dist) * pullSpeed * dt;
          this.y += (dy / dist) * pullSpeed * dt;
        }
      }

      /**
       * Renders the glowing XP square, Boss Cache, or decaying Luck Crystal on canvas.
       * Decaying luck tokens dynamically morph color from yellow -> green -> grey -> black
       * to visually indicate XP depletion without printing textual numbers.
       *
       * How to call:
       *   item.draw(ctx);
       *
       * @param {CanvasRenderingContext2D} ctx - Canvas context.
       * @returns {void}
       */
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y + Math.sin(this.bobOffset) * 2.5);
        ctx.rotate(this.rotation);

        const half = this.size / 2;

        if (this.isLuckToken) {
          // Decaying Luck Crystal: Clean square geometry matching regular drops,
          // with color state showing remaining value: yellow -> green -> grey -> black.
          // Strictly no numbers printed on the token face.
          const lifeFraction = Math.max(0, this.luckTimer / this.luckDuration);
          let strokeColor = "#facc15";
          let fillColor = "#422006";
          let coreColor = "#fef08a";
          let shadowColor = "#eab308";
          let shadowBlur = 12;

          if (lifeFraction > 0.60) {
            // Yellow phase: High bonus XP
            strokeColor = "#facc15";
            fillColor = "#422006";
            coreColor = "#fef08a";
            shadowColor = "#eab308";
            shadowBlur = 12;
          } else if (lifeFraction > 0.25) {
            // Green phase: Moderate bonus XP
            strokeColor = "#22c55e";
            fillColor = "#064e3b";
            coreColor = "#86efac";
            shadowColor = "#16a34a";
            shadowBlur = 9;
          } else if (lifeFraction > 0.08) {
            // Grey phase: Depleted bonus XP
            strokeColor = "#64748b";
            fillColor = "#1e293b";
            coreColor = "#94a3b8";
            shadowColor = "#475569";
            shadowBlur = 5;
          } else {
            // Black / Charcoal phase: About to expire
            strokeColor = "#27272a";
            fillColor = "#09090b";
            coreColor = "#3f3f46";
            shadowColor = "rgba(0, 0, 0, 0.6)";
            shadowBlur = 2;
          }

          // Outer resonant border
          ctx.beginPath();
          ctx.rect(-half, -half, this.size, this.size);
          ctx.fillStyle = fillColor;
          ctx.fill();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2.0;
          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = shadowBlur;
          ctx.stroke();

          // Inner luminescent nucleus
          ctx.beginPath();
          ctx.rect(-half * 0.45, -half * 0.45, this.size * 0.45, this.size * 0.45);
          ctx.fillStyle = coreColor;
          ctx.shadowBlur = 0;
          ctx.fill();
        } else {
          // Regular XP square or Boss Cache
          ctx.beginPath();
          ctx.rect(-half, -half, this.size, this.size);
          ctx.fillStyle = this.isBossCache ? "#78350f" : "#064e3b";
          ctx.fill();
          ctx.strokeStyle = this.color;
          ctx.lineWidth = this.isBossCache ? 2.5 : 1.75;
          ctx.shadowColor = this.color;
          ctx.shadowBlur = this.isBossCache ? 12 : 8;
          ctx.stroke();

          // Inner glowing nucleus
          ctx.beginPath();
          ctx.rect(-half * 0.45, -half * 0.45, this.size * 0.45, this.size * 0.45);
          ctx.fillStyle = this.isBossCache ? "#fef08a" : "#a7f3d0";
          ctx.fill();
        }

        ctx.restore();
      }
    }

    /**
     * =========================================================================
     * Class: FloatingText
     * =========================================================================
     * Temporary floating combat text displaying XP gains and damage metrics.
     * =========================================================================
     */
    class FloatingText {
      /**
       * Constructs a new FloatingText instance.
       *
       * How to call:
       *   const text = new FloatingText(x, y, "+1 XP", "#34d399", 0.9);
       *
       * @param {number} x - Horizontal coordinate.
       * @param {number} y - Vertical coordinate.
       * @param {string} text - Message to render.
       * @param {string} color - Display text color.
       * @param {number} duration - Lifetime in seconds.
       */
      constructor(x, y, text, color = "#ffffff", duration = 0.8) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.duration = duration;
        this.life = duration;
        this.vy = -35;
        this.isDestroyed = false;
      }

      /**
       * Advances vertical drift and decays opacity over time.
       *
       * How to call:
       *   text.update(dt);
       *
       * @param {number} dt - Frame delta time.
       * @returns {void}
       */
      update(dt) {
        this.y += this.vy * dt;
        this.life -= dt;
        if (this.life <= 0) {
          this.isDestroyed = true;
        }
      }

      /**
       * Renders fading text onto the canvas context.
       *
       * How to call:
       *   text.draw(ctx);
       *
       * @param {CanvasRenderingContext2D} ctx - Canvas context.
       * @returns {void}
       */
      draw(ctx) {
        const alpha = Math.max(0, this.life / this.duration);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillStyle = this.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
      }
    }

    /**
     * =========================================================================
     * Class: UpgradeManager
     * =========================================================================
     * Brotato-style upgrade system: Generates randomized 3-card offerings upon
     * Level Up, handles pointer hit-testing and keyboard shortcuts [1], [2], [3],
     * and mutates the player vessel stats.
     * =========================================================================
     */


/* INTEGRATED: boost-capable Player and boss charge telegraph */
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
})();


/* INTEGRATED: enemy projectile range and combat visual indicators */
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
