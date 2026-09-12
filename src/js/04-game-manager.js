class GameManager {
      /**
       * Constructs and initializes the GameManager.
       *
       * How to call:
       *   const game = new GameManager(document.getElementById("gameCanvas"));
       *   game.init();
       *
       * @param {HTMLCanvasElement} canvas - The HTML5 canvas element.
       */
      constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // Logical game coordinate dimensions
        this.width = 1000;
        this.height = 750;

        // State Machine: 'PLAYING', 'LEVEL_UP', 'GAME_OVER'
        this.state = "PLAYING";

        // Active keyboard tracking
        this.activeKeys = new Set();

        // Distinct entity collections
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.enemies = [];
        this.droppedItems = [];
        this.floatingTexts = [];
        this.lightningArcs = [];
        this.blastEffects = [];

        // Player instantiation in center of arena
        this.player = new Player(this.width / 2, this.height / 2);

        // Brotato-style Upgrade System
        this.upgradeManager = new UpgradeManager();

        // Auto-combat parameters
        this.autoFireTimer = 0.0;

        // Enemy spawner parameters
        this.spawnInterval = 1.1;
        this.spawnTimer = 0.0;
        this.enemySpeedBase = 90;

        // Player Progression & Mathematical EXP Curve
        this.playerLevel = 1;
        this.currentXp = 0;
        this.xpThreshold = this.calculateXpThreshold(1); // 3 XP for immediate level-up access
        this.totalScore = 0;
        this.totalKills = 0;

        // Boss encounter management
        this.bossTier = 1;
        this.activeBoss = null;
        this.bossWarningTimer = 0;

        // High-DPI canvas scaling factor
        this.dpr = window.devicePixelRatio || 1;

        // Frame timing
        this.lastTimestamp = 0;
        this.animationFrameId = null;

        // Pointer tracking
        this.mouseX = 0;
        this.mouseY = 0;

        // Level-up card selection "burn" (disintegration) animation state.
        // When active, drawOverlay renders the chosen card burning away before
        // the upgrade is actually applied and the overlay closes. Also used
        // to gate the Balatro Joker pickup -> rack reveal sequence.
        this.cardBurn = {
          active: false,
          cardIndex: -1,
          progress: 0,
          embers: [],
          pendingCard: null
        };
        this.cardBurnDuration = 0.55; // seconds

        // DOM element references
        this.hudSector = document.getElementById("hudSector");
        this.hudScore = document.getElementById("hudScore");
        this.hudKills = document.getElementById("hudKills");
        this.hudHp = document.getElementById("hudHp");
        this.hudLevel = document.getElementById("hudLevel");
        this.hudXp = document.getElementById("hudXp");
        this.hudRange = document.getElementById("hudRange");
        this.hudUpgrades = document.getElementById("hudUpgrades");

        logDebug(1, "GameManager instance initialized with Brotato upgrades and EXP leveling curve", {
          width: this.width,
          height: this.height,
          initialXpThreshold: this.xpThreshold
        });
      }

      /**
       * Calculates the required XP threshold for a given player level.
       * Implements a standard survivor-genre progressive curve:
       * Early levels are fast and punchy to introduce player agency,
       * while later levels require escalating harvesting.
       *
       * Curve progression (10x scaling):
       *   Level 1: 30 XP (fast immediate level-up)
       *   Level 2: 60 XP
       *   Level 3: 100 XP
       *   Level 4: 150 XP
       *   Level 5: 210 XP
       *   Level 6: 280 XP
       *
       * How to call:
       *   const target = game.calculateXpThreshold(level);
       *
       * @param {number} level - Current player level (1-indexed).
       * @returns {number} Target XP requirement for this level.
       */
      calculateXpThreshold(level) {
        if (level === 1) return 30;
        if (level === 2) return 60;
        if (level === 3) return 100;
        const base = 100;
        const linear = (level - 3) * 40;
        const quadratic = Math.floor(Math.pow(level - 3, 1.3) * 20);
        return base + linear + quadratic;
      }

      /**
       * Pauses active combat simulation and opens the Brotato-style upgrade selection overlay.
       *
       * How to call:
       *   this.triggerLevelUp();
       *
       * @returns {void}
       */
      triggerLevelUp() {
        this.state = "LEVEL_UP";
        this.upgradeManager.generateOfferings();
        logDebug(1, "LEVEL UP TRIGGERED! Game paused for upgrade selection.", {
          level: this.playerLevel,
          currentXp: this.currentXp,
          threshold: this.xpThreshold
        });
      }

      /**
       * Configures canvas dimensions, binds listeners, and launches main loop.
       *
       * How to call:
       *   game.init();
       *
       * @returns {void}
       */
      init() {
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);

        this.bindEvents();
        this.updateHUD();

        logDebug(1, "Canvas initialized with High-DPI support", { dpr: this.dpr });

        this.lastTimestamp = performance.now();
        this.animationFrameId = requestAnimationFrame((ts) => this.gameLoop(ts));
      }

      /**
       * Registers keyboard, pointer, and debug UI event listeners.
       *
       * How to call:
       *   this.bindEvents();
       *
       * @returns {void}
       */
      bindEvents() {
        window.addEventListener("keydown", (e) => {
          this.activeKeys.add(e.code);
          logDebug(4, "Key down event", { code: e.code, key: e.key });

          // Start game on movement key if in READY state
          if (this.state === "READY") {
            if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
              this.startGame();
            }
          }

          // Hotkey selection for upgrades [1], [2], [3] during LEVEL_UP
          if (this.state === "LEVEL_UP") {
            if (e.key === "1" || e.code === "Digit1" || e.code === "Numpad1") {
              this.selectUpgradeByIndex(0);
            } else if (e.key === "2" || e.code === "Digit2" || e.code === "Numpad2") {
              this.selectUpgradeByIndex(1);
            } else if (e.key === "3" || e.code === "Digit3" || e.code === "Numpad3") {
              this.selectUpgradeByIndex(2);
            }
          }

          // Hotkey [L] for manual level-up testing during active gameplay
          if (e.code === "KeyL" || e.key === "l" || e.key === "L") {
            if (this.state === "READY") {
              this.startGame();
            }
            if (this.state === "PLAYING") {
              this.currentXp = this.xpThreshold;
              this.triggerLevelUp();
            }
          }
        });

        window.addEventListener("keyup", (e) => {
          this.activeKeys.delete(e.code);
          logDebug(4, "Key up event", { code: e.code });
        });

        // Pointer move event tracking
        const updatePointerCoordinates = (clientX, clientY) => {
          const rect = this.canvas.getBoundingClientRect();
          this.mouseX = (clientX - rect.left) * (this.width / rect.width);
          this.mouseY = (clientY - rect.top) * (this.height / rect.height);
        };

        this.canvas.addEventListener("mousemove", (e) => {
          updatePointerCoordinates(e.clientX, e.clientY);

          if (this.state === "LEVEL_UP") {
            const hit = this.upgradeManager.hitTest(this.mouseX, this.mouseY, this.width, this.height);
            this.upgradeManager.hoveredCardIndex = hit;
            this.canvas.style.cursor = hit !== -1 ? "pointer" : "default";
          } else {
            this.canvas.style.cursor = "crosshair";
          }
        });

        // Canvas click handler
        this.canvas.addEventListener("click", (e) => {
          updatePointerCoordinates(e.clientX, e.clientY);
          this.handleCanvasClick();
        });

        // Interactive debug level buttons in footer
        const debugButtons = document.querySelectorAll(".debug-btn[data-level]");
        debugButtons.forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const newLevel = parseInt(e.currentTarget.getAttribute("data-level"), 10);
            this.setDebugLevel(newLevel);

            debugButtons.forEach((b) => b.classList.remove("active"));
            e.currentTarget.classList.add("active");
          });
        });

        // Quick testing button for immediate level-up presentation
        const testLevelUpBtn = document.getElementById("btnTestLevelUp");
        if (testLevelUpBtn) {
          testLevelUpBtn.addEventListener("click", () => {
            if (this.state === "READY") {
              this.startGame();
            }
            this.currentXp = this.xpThreshold;
            this.triggerLevelUp();
          });
        }

        const hudLevelUpBtn = document.getElementById("btnHudLevelUp");
        if (hudLevelUpBtn) {
          hudLevelUpBtn.addEventListener("click", () => {
            if (this.state === "READY") {
              this.startGame();
            }
            this.currentXp = this.xpThreshold;
            this.triggerLevelUp();
          });
        }

        // Test button to guarantee a Balatro Joker offering
        const testJokerBtn = document.getElementById("btnTestJoker");
        if (testJokerBtn) {
          testJokerBtn.addEventListener("click", () => {
            if (this.state === "READY") {
              this.startGame();
            }
            this.state = "LEVEL_UP";
            this.upgradeManager.generateOfferings(true);
            logDebug(1, "Test button: Forced Balatro Joker offering generated");
          });
        }

        logDebug(1, "Event listeners bound successfully");
      }

      /**
       * Mutates active debug integer flag and informs console.
       *
       * How to call:
       *   game.setDebugLevel(2);
       *
       * @param {number} level - New debug integer flag (0 to 4).
       * @returns {void}
       */
      setDebugLevel(level) {
        DEBUG_LEVEL = Math.max(0, Math.min(4, level));
        console.log(`[DEBUG LEVEL UPDATED] Active Level is now: ${DEBUG_LEVEL}`);
        logDebug(1, `Debug verbosity switched to level ${DEBUG_LEVEL}`);
      }

      /**
       * Handles canvas pointer click events across states.
       *
       * How to call:
       *   this.handleCanvasClick();
       *
       * @returns {void}
       */
      handleCanvasClick() {
        logDebug(2, "Canvas clicked", { currentState: this.state, x: this.mouseX, y: this.mouseY });

        if (this.state === "READY") {
          this.startGame();
        } else if (this.state === "LEVEL_UP") {
          if (this.cardBurn.active) return; // Ignore clicks mid-animation
          const hit = this.upgradeManager.hitTest(this.mouseX, this.mouseY, this.width, this.height);
          if (hit !== -1) {
            this.selectUpgradeByIndex(hit);
          }
        } else if (this.state === "GAME_OVER") {
          this.restartGame();
        }
      }

      /**
       * Transitions state machine from READY to PLAYING.
       *
       * How to call:
       *   this.startGame();
       *
       * @returns {void}
       */
      startGame() {
        this.state = "PLAYING";
        this.lastTimestamp = performance.now();
        logDebug(1, "State Transition: READY -> PLAYING. Combat simulation active.");
      }

      /**
       * Kicks off the card-disintegration "burn" animation for the chosen
       * card ONLY when selecting a Balatro Joker card. Normal upgrades are
       * applied immediately without any burn animation or delay.
       *
       * How to call:
       *   this.selectUpgradeByIndex(0);
       *
       * @param {number} index - 0, 1, or 2.
       * @returns {void}
       */
      selectUpgradeByIndex(index) {
        if (this.cardBurn.active) return;
        if (index < 0 || index >= this.upgradeManager.activeCards.length) return;

        const chosenCard = this.upgradeManager.activeCards[index];
        if (!chosenCard) return;

        // The burn animation should ONLY happen when picking a rare Joker card!
        // Normal upgrades apply immediately without any burn or delay.
        if (chosenCard.isJoker) {
          this.cardBurn.active = true;
          this.cardBurn.cardIndex = index;
          this.cardBurn.progress = 0;
          this.cardBurn.embers = [];
          this.cardBurn.pendingCard = chosenCard;

          logDebug(1, "Rare Balatro Joker card selected, beginning authentic card burn disintegration", {
            index,
            card: chosenCard.title
          });
        } else {
          logDebug(1, "Standard upgrade card selected, applying immediately without burn", {
            index,
            card: chosenCard.title
          });
          this.finalizeCardSelection(index);
        }
      }

      /**
       * Advances the active card-burn animation by dt. Called every frame
       * while state === "LEVEL_UP". Triggers finalizeCardSelection once the
       * animation completes.
       *
       * How to call:
       *   this.updateCardBurn(dt);
       *
       * @param {number} dt - Frame delta time in seconds.
       * @returns {void}
       */
      updateCardBurn(dt) {
        if (!this.cardBurn.active) return;
        this.cardBurn.progress += dt / this.cardBurnDuration;

        // Procedurally spawn chunky pixel embers along the burning frontier
        const rects = this.upgradeManager.getCardLayout(this.width, this.height);
        if (this.cardBurn.cardIndex >= 0 && this.cardBurn.cardIndex < rects.length) {
          const r = rects[this.cardBurn.cardIndex];
          const burnLineY = r.y + r.h * (1 - this.cardBurn.progress);

          // Spawn 3-5 chunky pixel embers per frame
          const spawnCount = 3 + Math.floor(Math.random() * 3);
          for (let e = 0; e < spawnCount; e++) {
            this.cardBurn.embers.push({
              x: r.x + Math.random() * r.w,
              y: burnLineY + (Math.random() - 0.5) * 6,
              vx: (Math.random() - 0.5) * 45,
              vy: -70 - Math.random() * 110,
              size: 3 + Math.floor(Math.random() * 3), // chunky 3-5px pixel blocks
              life: 0.3 + Math.random() * 0.25,
              maxLife: 0.55,
              seed: Math.random() * 10
            });
          }

          // Advance embers with sinusoidal sway
          for (let emIdx = this.cardBurn.embers.length - 1; emIdx >= 0; emIdx--) {
            const ember = this.cardBurn.embers[emIdx];
            ember.life -= dt;
            if (ember.life <= 0) {
              this.cardBurn.embers.splice(emIdx, 1);
              continue;
            }
            ember.x += (ember.vx + Math.sin(ember.seed + ember.life * 15) * 20) * dt;
            ember.y += ember.vy * dt;
          }
        }

        if (this.cardBurn.progress >= 1) {
          this.cardBurn.progress = 1;
          const index = this.cardBurn.cardIndex;
          this.cardBurn.active = false;
          this.cardBurn.cardIndex = -1;
          this.cardBurn.embers = [];
          this.cardBurn.pendingCard = null;
          this.finalizeCardSelection(index);
        }
      }

      /**
       * Applies the chosen upgrade to the player vessel, advances player level,
       * checks boss spawn, carries over surplus XP against the new threshold
       * curve, and resumes the loop. If the chosen card is a Balatro Joker,
       * routes it through onJokerAcquired to trigger the rack reveal instead.
       *
       * How to call:
       *   this.finalizeCardSelection(0);
       *
       * @param {number} index - 0, 1, or 2.
       * @returns {void}
       */
      finalizeCardSelection(index) {
        const chosenCard = this.upgradeManager.activeCards[index];
        const applied = this.upgradeManager.applyUpgrade(index, this.player);
        if (!applied) return;

        if (chosenCard && chosenCard.isJoker) {
          this.onJokerAcquired(chosenCard);
        }

        // Deduct threshold and retain surplus XP for next level
        this.currentXp -= this.xpThreshold;
        if (this.currentXp < 0) this.currentXp = 0;

        this.playerLevel += 1;
        this.xpThreshold = this.calculateXpThreshold(this.playerLevel);
        this.enemySpeedBase += 3; // Gradual difficulty ramping

        // Visual floating level-up acknowledgment
        this.floatingTexts.push(
          new FloatingText(this.player.x, this.player.y - 28, `LEVEL ${this.playerLevel}!`, "#38bdf8", 1.2)
        );

        // Check if an escalating boss should spawn (every 3 levels: level 3, 6, 9...)
        if (this.playerLevel % 3 === 0 && !this.activeBoss) {
          this.triggerBossWarning();
        }

        // If surplus XP is already enough for another level up:
        if (this.currentXp >= this.xpThreshold) {
          this.upgradeManager.generateOfferings();
          logDebug(1, "Surplus XP immediately triggers consecutive level up choice!");
        } else {
          this.state = "PLAYING";
          this.lastTimestamp = performance.now(); // Baseline reset prevents delta time jump
        }

        this.updateHUD();

        logDebug(1, "Upgrade applied and progression updated", {
          newLevel: this.playerLevel,
          surplusXp: this.currentXp,
          nextThreshold: this.xpThreshold
        });
      }

      /**
       * Triggers a visual warning banner for 2.2 seconds before the boss entity arrives.
       *
       * How to call:
       *   this.triggerBossWarning();
       *
       * @returns {void}
       */
      triggerBossWarning() {
        this.bossWarningTimer = 2.2;
        logDebug(1, "Boss warning sequence started! High threat approaching.");
      }

      /**
       * Spawns an escalating BossEnemy at the perimeter of the arena.
       *
       * How to call:
       *   this.spawnBoss();
       *
       * @returns {void}
       */
      spawnBoss() {
        const tier = Math.floor(this.playerLevel / 3);
        this.bossTier = tier;
        const boss = new BossEnemy(this.width / 2, -50, tier, this.width, this.height);
        this.enemies.push(boss);
        this.activeBoss = boss;

        logDebug(1, "Boss spawned in arena", {
          name: boss.name,
          tier: boss.tier,
          health: boss.health
        });
      }

      /**
       * Reinitializes all entity collections and stats following Game Over.
       *
       * How to call:
       *   this.restartGame();
       *
       * @returns {void}
       */
      restartGame() {
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.enemies = [];
        this.droppedItems = [];
        this.floatingTexts = [];
        this.lightningArcs = [];
        this.blastEffects = [];

        this.player.reset(this.width / 2, this.height / 2);
        this.playerLevel = 1;
        this.currentXp = 0;
        this.xpThreshold = this.calculateXpThreshold(1);
        this.totalScore = 0;
        this.totalKills = 0;
        this.enemySpeedBase = 90;
        this.autoFireTimer = 0.0;
        this.spawnTimer = 0.0;
        this.activeBoss = null;
        this.bossWarningTimer = 0;

        this.state = "PLAYING";
        this.lastTimestamp = performance.now();
        this.updateHUD();

        // Reset the card-burn animation state and the joker rack DOM back to
        // its fully-hidden, zero-trace starting condition.
        this.cardBurn = { active: false, cardIndex: -1, progress: 0, embers: [], pendingCard: null };
        const rack = document.getElementById("balatro-joker-rack");
        if (rack) rack.classList.remove("joker-rack-active");
        for (let s = 0; s < 5; s++) {
          const slotEl = document.getElementById(`jokerSlot${s}`);
          if (slotEl) {
            slotEl.classList.add("empty");
            slotEl.innerHTML = "";
          }
        }
        const counterLabel = document.getElementById("jokerCountLabel");
        if (counterLabel) counterLabel.textContent = "0 / 5";
        this.hideJokerTooltip();

        logDebug(1, "State Transition: GAME_OVER -> PLAYING. Simulation re-initialized.");
      }

      /**
       * Transitions state machine to GAME_OVER upon player depletion.
       *
       * How to call:
       *   this.triggerGameOver();
       *
       * @returns {void}
       */
      triggerGameOver() {
        this.state = "GAME_OVER";
        this.updateHUD();
        logDebug(1, "State Transition: -> GAME_OVER. Player vessel destroyed.", {
          finalScore: this.totalScore,
          finalLevel: this.playerLevel,
          totalKills: this.totalKills
        });
      }

      /**
       * Finds the closest enemy to the player using Euclidean vector calculations,
       * constrained to a maximum targeting range.
       *
       * How to call:
       *   const target = this.findNearestEnemy(this.player.weaponRange);
       *   if (target.enemy) { ... }
       *
       * @param {number} [maxRange=Infinity] - Maximum targeting acquisition range in pixels.
       * @returns {{ enemy: Enemy|null, distance: number, unitX: number, unitY: number }}
       */
      findNearestEnemy(maxRange = Infinity) {
        if (this.enemies.length === 0) {
          return { enemy: null, distance: Infinity, unitX: 0, unitY: 0 };
        }

        let nearestEnemy = null;
        let minDistanceSq = maxRange === Infinity ? Infinity : maxRange * maxRange;
        let nearestDx = 0;
        let nearestDy = 0;

        for (let i = 0; i < this.enemies.length; i++) {
          const enemy = this.enemies[i];
          if (enemy.isDestroyed) continue;

          const dx = enemy.x - this.player.x;
          const dy = enemy.y - this.player.y;
          const distSq = dx * dx + dy * dy;

          if (distSq <= minDistanceSq) {
            minDistanceSq = distSq;
            nearestEnemy = enemy;
            nearestDx = dx;
            nearestDy = dy;
          }
        }

        if (!nearestEnemy) {
          return { enemy: null, distance: Infinity, unitX: 0, unitY: 0 };
        }

        const distance = Math.sqrt(minDistanceSq);
        const unitX = distance > 0 ? nearestDx / distance : 0;
        const unitY = distance > 0 ? nearestDy / distance : 0;

        return { enemy: nearestEnemy, distance, unitX, unitY };
      }

      /**
       * Auto-combat logic: Automatically fires projectiles targeting the nearest enemy
       * center within finite weapon range based on fireInterval, damage, multishot count, and pierce stats.
       *
       * How to call:
       *   this.handleAutoCombat(dt);
       *
       * @param {number} dt - Delta time in seconds.
       * @returns {void}
       */
      handleAutoCombat(dt) {
        this.autoFireTimer += dt;

        if (this.autoFireTimer >= this.player.fireInterval) {
          this.autoFireTimer -= this.player.fireInterval;

          const target = this.findNearestEnemy(this.player.weaponRange);
          if (target.enemy !== null) {
            const baseAngle = Math.atan2(target.unitY, target.unitX);
            const count = this.player.multishotCount;

            const spreadStep = 0.14; // radians
            const startAngle = baseAngle - ((count - 1) * spreadStep) / 2;

            for (let m = 0; m < count; m++) {
              const shotAngle = startAngle + m * spreadStep;

              // Check critical strike roll
              const isCrit = Math.random() < this.player.critChance;
              const damage = isCrit ? Math.round(this.player.damage * this.player.critMultiplier) : this.player.damage;

              const spawnProjectile = (angleOffset = 0) => {
                const finalAngle = shotAngle + angleOffset;
                let vx = Math.cos(finalAngle) * this.player.projectileSpeed;
                let vy = Math.sin(finalAngle) * this.player.projectileSpeed;

                const projectile = new Projectile(
                  this.player.x,
                  this.player.y,
                  vx,
                  vy,
                  4.5,
                  damage,
                  this.player.pierceCount,
                  "#fbbf24",
                  isCrit,
                  this.player.chainHits,
                  this.player.hasExplosiveBlast,
                  this.player.blastRadius,
                  this.player.ricochetCount,
                  // Range only gates targeting acquisition now; flight distance
                  // is governed by a separate, generous ceiling (see decoupling
                  // fix below), so weapon-range upgrades no longer clip bullets.
                  PROJECTILE_FLIGHT_RANGE
                );

                // Balatro Joker: Snail Mail — starts at 1/3 velocity and
                // accelerates in flight (see Projectile.update/draw).
                if (this.player.hasSnailMailJoker) {
                  projectile.hasSnailMail = true;
                  projectile.vx /= 3;
                  projectile.vy /= 3;
                }

                return projectile;
              };

              if (this.player.hasSuperpositionJoker) {
                // Balatro Joker: Superposition — doubles this shot into an
                // entangled pair with a slight random direction offset each.
                // The first of the pair to hit an enemy collapses the state:
                // 50% it's "real" (deals damage, twin fizzles), 50% it's
                // "fake" (fizzles harmlessly, twin becomes a normal bullet).
                const jitterA = (Math.random() - 0.5) * 0.12;
                const jitterB = (Math.random() - 0.5) * 0.12;
                const twinA = spawnProjectile(jitterA);
                const twinB = spawnProjectile(jitterB);
                const pairId = `sp_${m}_${Math.random().toString(36).slice(2, 9)}`;
                twinA.superpositionPairId = pairId;
                twinB.superpositionPairId = pairId;
                twinA.twin = twinB;
                twinB.twin = twinA;
                this.projectiles.push(twinA, twinB);
              } else {
                this.projectiles.push(spawnProjectile(0));
              }
            }

            logDebug(2, "Auto-combat: Volley fired within weapon range", {
              count,
              damage: this.player.damage,
              weaponRange: this.player.weaponRange,
              targetCoord: { x: target.enemy.x.toFixed(1), y: target.enemy.y.toFixed(1) }
            });
          }
        }
      }

      /**
       * Spawns regular and diversified tracking enemies at perimeter edges.
       * Supports "chaser", "swarmer", "shooter", and "heavy" archetypes.
       *
       * How to call:
       *   this.spawnEnemies(dt);
       *
       * @param {number} dt - Delta time in seconds.
       * @returns {void}
       */
      spawnEnemies(dt) {
        const currentInterval = this.activeBoss ? this.spawnInterval * 2.2 : this.spawnInterval;
        this.spawnTimer += dt;

        if (this.spawnTimer >= currentInterval) {
          this.spawnTimer -= currentInterval;

          const margin = 25;
          const getSpawnCoord = () => {
            const edge = Math.floor(Math.random() * 4);
            let x = 0;
            let y = 0;
            switch (edge) {
              case 0: // Top
                x = Math.random() * this.width;
                y = -margin;
                break;
              case 1: // Right
                x = this.width + margin;
                y = Math.random() * this.height;
                break;
              case 2: // Bottom
                x = Math.random() * this.width;
                y = this.height + margin;
                break;
              case 3: // Left
                x = -margin;
                y = Math.random() * this.height;
                break;
            }
            return { x, y };
          };

          // Determine enemy archetype based on player level and weighted probabilities
          const roll = Math.random();
          let archetype = "chaser";

          if (this.playerLevel >= 3 && roll < 0.18) {
            archetype = "heavy";
          } else if (this.playerLevel >= 2 && roll < 0.42) {
            archetype = "shooter";
          } else if (roll < 0.70) {
            archetype = "swarmer";
          } else {
            archetype = "chaser";
          }

          if (archetype === "swarmer") {
            // Swarmers spawn in fast coordinated packs of 2 to 3
            const packSize = 2 + (Math.random() < 0.4 ? 1 : 0);
            const { x: baseX, y: baseY } = getSpawnCoord();
            for (let s = 0; s < packSize; s++) {
              const sx = baseX + (Math.random() - 0.5) * 35;
              const sy = baseY + (Math.random() - 0.5) * 35;
              const swarmerSpeed = this.enemySpeedBase * 1.5 + (Math.random() - 0.5) * 20;
              const swarmerHp = 14 + this.playerLevel * 3;
              const swarmer = new Enemy(sx, sy, 8, swarmerSpeed, swarmerHp, "#ec4899", "swarmer");
              this.enemies.push(swarmer);
            }
            logDebug(3, "Swarmer pack spawned", { count: packSize, baseX, baseY });
          } else if (archetype === "shooter") {
            const { x, y } = getSpawnCoord();
            const shooterSpeed = Math.max(55, this.enemySpeedBase * 0.75 + (Math.random() - 0.5) * 15);
            const shooterHp = 38 + this.playerLevel * 7;
            const shooter = new Enemy(x, y, 14, shooterSpeed, shooterHp, "#a855f7", "shooter");
            this.enemies.push(shooter);
            logDebug(3, "Ranged shooter hostile spawned", { x, y });
          } else if (archetype === "heavy") {
            const { x, y } = getSpawnCoord();
            const heavySpeed = Math.max(45, this.enemySpeedBase * 0.55);
            const heavyHp = 110 + this.playerLevel * 20;
            const heavy = new Enemy(x, y, 20, heavySpeed, heavyHp, "#f97316", "heavy");
            this.enemies.push(heavy);
            logDebug(3, "Armored heavy hostile spawned", { x, y });
          } else {
            const { x, y } = getSpawnCoord();
            const enemySpeed = this.enemySpeedBase + (Math.random() - 0.5) * 20;
            const enemyHp = 25 + this.playerLevel * 5;
            const enemy = new Enemy(x, y, 12, enemySpeed, enemyHp, "#f43f5e", "chaser");
            this.enemies.push(enemy);
            logDebug(3, "Chaser hostile spawned", { x, y });
          }
        }
      }

      /**
       * Handles enemy defeat, score calculation, dropped items, and nanite leech.
       * Incorporates 10x XP scaling and Player Luck-based decaying XP tokens.
       *
       * How to call:
       *   this.handleEnemyDefeat(enemy);
       *
       * @param {Enemy} enemy - The destroyed enemy instance.
       * @returns {void}
       */
      handleEnemyDefeat(enemy) {
        if (enemy.hasDroppedLoot) return;
        enemy.hasDroppedLoot = true;
        enemy.isDestroyed = true;
        this.totalKills += 1;

        // Nanite siphon life leech chance
        if (this.player.lifeLeechChance > 0 && Math.random() < this.player.lifeLeechChance) {
          const restored = this.player.heal(8);
          if (restored > 0) {
            this.floatingTexts.push(
              new FloatingText(this.player.x, this.player.y - 20, `+${restored} HP`, "#34d399", 0.8)
            );
          }
        }

        // Clamp drop coordinates to ensure items always land safely within playable arena view
        const dropX = Math.max(20, Math.min(this.width - 20, enemy.x));
        const dropY = Math.max(20, Math.min(this.height - 20, enemy.y));

        if (enemy.isBoss) {
          this.totalScore += 1200 * enemy.tier;
          this.activeBoss = null;

          // Boss drops huge 50 XP Boss Cache (10x scaling)
          const cache = new DroppedItem(dropX, dropY, 22, 50, true, "#fbbf24");
          this.droppedItems.push(cache);
          logDebug(1, "BOSS DEFEATED! Boss Cache dropped", { name: enemy.name, dropX, dropY });
        } else {
          // Standard enemies: XP value and score based on archetype (10x scaled)
          let baseScore = 100;
          let xpValue = 10;
          let color = "#34d399";
          let size = 12;

          if (enemy.enemyType === "swarmer") {
            baseScore = 60;
            xpValue = 5;
            color = "#6ee7b7";
            size = 9;
          } else if (enemy.enemyType === "shooter") {
            baseScore = 180;
            xpValue = 20;
            color = "#38bdf8";
            size = 14;
          } else if (enemy.enemyType === "heavy") {
            baseScore = 320;
            xpValue = 40;
            color = "#fbbf24";
            size = 17;
          }

          this.totalScore += baseScore;

          // Luck roll: very rare base rate (< 1%), scaling with diminishing returns
          // toward ~50% as player acquires Lucky Charm upgrades (+1 luck each).
          const baseLuckRate = 0.008; // 0.8% base rate (< 1%)
          const maxLuckRate = 0.50; // Diminishing returns cap around 50%
          const playerLuck = Math.max(0, this.player.luck || 0);
          const diminishingCurve = 1 - Math.exp(-0.25 * playerLuck);
          const luckDropChance = baseLuckRate + (maxLuckRate - baseLuckRate) * diminishingCurve;
          const isLuckyDrop = Math.random() < luckDropChance;

          if (isLuckyDrop) {
            // Lucky drop gives 5x the normal node XP, decaying over 10s down to 1 XP
            const luckyXpValue = xpValue * 5;
            const luckySize = Math.round(size * 1.35);
            const luckToken = new DroppedItem(
              dropX,
              dropY,
              luckySize,
              luckyXpValue,
              false,
              "#facc15",
              true,
              luckyXpValue,
              10.0
            );
            this.droppedItems.push(luckToken);
            this.floatingTexts.push(
              new FloatingText(dropX, dropY - 16, "LUCKY DROP!", "#facc15", 0.9)
            );
            logDebug(2, "Lucky XP node dropped by enemy (5x multiplier)", {
              dropX,
              dropY,
              luckyXpValue,
              luckStat: playerLuck,
              luckDropChance: (luckDropChance * 100).toFixed(1) + "%"
            });
          } else {
            const xpSquare = new DroppedItem(dropX, dropY, size, xpValue, false, color);
            this.droppedItems.push(xpSquare);
            logDebug(2, "XP square dropped by defeated enemy", { dropX, dropY, xpValue });
          }
        }
      }

      /**
       * Shatters a spent projectile into kinetic fragmentation shards on its
       * final impact (after any piercing has already been consumed).
       *
       * Mechanics:
       *  - Shard count == player.fragmentation.
       *  - Each shard does diminishing damage relative to the previous one
       *    (75% falloff per extra shard), but every shard still adds a
       *    positive amount to total aggregate damage.
       *  - Shards have a base 25% chance to pierce through an enemy, rising
       *    with fragmentation investment (+10% per point above 1, capped).
       *  - Spread angle widens with impact speed: a slow final hit produces
       *    a tight cone of shards, a fast one sprays them wide.
       *  - Spawns a small kinetic flash blast effect for feedback.
       *
       * How to call:
       *   this.spawnFragments(proj, effectiveDamage, impactSpeed);
       *
       * @param {Projectile} proj - The projectile that just made its final impact.
       * @param {number} hitDamage - The damage that projectile just dealt (post speed-scaling).
       * @param {number} impactSpeed - The projectile's velocity magnitude at impact.
       * @returns {void}
       */
      spawnFragments(proj, hitDamage, impactSpeed) {
        const fragCount = Math.max(0, Math.round(this.player.fragmentation));
        if (fragCount <= 0) return;

        // Base 25% penetration chance, scaling with fragmentation (+10% per point above 1)
        const basePierceChance = 0.25;
        const pierceChance = Math.min(0.85, basePierceChance + Math.max(0, this.player.fragmentation - 1) * 0.10);
        const spreadDeg = Math.min(150, 32 + impactSpeed * 0.05);
        const baseAngle = Math.atan2(proj.vy, proj.vx);

        // Flash detonation ring for visual clarity
        this.blastEffects.push(new BlastEffect(proj.x, proj.y, 22, "#fb923c", 0.18));

        for (let i = 0; i < fragCount; i++) {
          const falloff = Math.pow(0.75, i); // each additional shard contributes less, but never zero
          const fragDamage = Math.max(2, Math.round(hitDamage * 0.60 * falloff));
          const offset = (Math.random() - 0.5) * (spreadDeg * Math.PI / 180);
          const angle = baseAngle + offset;
          const fragSpeed = Math.max(220, impactSpeed * 0.65);
          
          // Penetration roll: base 25%, scales with fragmentation
          let shardPierce = 0;
          if (Math.random() < pierceChance) {
            shardPierce = 1;
            if (pierceChance > 0.55 && Math.random() < pierceChance * 0.5) {
              shardPierce = 2;
            }
          }

          // Advance shard slightly along flight vector so it clears the struck entity hull
          const spawnX = proj.x + Math.cos(angle) * 8;
          const spawnY = proj.y + Math.sin(angle) * 8;

          const shard = new Projectile(
            spawnX,
            spawnY,
            Math.cos(angle) * fragSpeed,
            Math.sin(angle) * fragSpeed,
            4.5,
            fragDamage,
            shardPierce,
            "#fb923c",
            false,
            0,
            false,
            0,
            0,
            340
          );
          shard.isFragment = true;
          // Fragments don't re-hit the enemy they were born from on the same frame.
          proj.hitEntities.forEach((e) => shard.hitEntities.add(e));
          this.projectiles.push(shard);
        }

        logDebug(3, "Fragmentation shards spawned", { fragCount, pierceChance: pierceChance.toFixed(2), spreadDeg: spreadDeg.toFixed(0) });
      }

      /**
       * Executes collision evaluations between all active entities.
       *
       * How to call:
       *   this.checkCollisions();
       *
       * @returns {void}
       */
      checkCollisions() {
        // 1. Player Projectiles vs Enemies
        for (let pIdx = 0; pIdx < this.projectiles.length; pIdx++) {
          const proj = this.projectiles[pIdx];
          if (proj.isDestroyed) continue;

          for (let eIdx = 0; eIdx < this.enemies.length; eIdx++) {
            const enemy = this.enemies[eIdx];
            if (enemy.isDestroyed || proj.hitEntities.has(enemy)) continue;

            const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
            if (dist < proj.radius + enemy.radius) {
              proj.hitEntities.add(enemy);

              // Balatro Joker: Superposition — resolve the quantum pair the
              // first time either twin lands a hit. This can destroy `proj`
              // outright (the "fake" branch), so it must run before any
              // damage/effects are applied.
              if (proj.superpositionPairId && !proj.superpositionResolved) {
                const twinRef = proj.twin;
                proj.superpositionResolved = true;
                if (twinRef) {
                  twinRef.superpositionResolved = true;
                  twinRef.superpositionPairId = null;
                  twinRef.twin = null;
                }
                proj.superpositionPairId = null;
                proj.twin = null;

                const isReal = Math.random() < 0.5;
                if (!isReal) {
                  // The "fake" bullet collapses harmlessly. The twin (now
                  // detached from superposition state above) carries on as
                  // an ordinary projectile from this point forward.
                  proj.isDestroyed = true;
                  logDebug(3, "Superposition collapse: fake bullet fizzled", {});
                  break;
                } else if (twinRef) {
                  // The "real" bullet deals damage; its twin fizzles out.
                  twinRef.isDestroyed = true;
                  logDebug(3, "Superposition collapse: real bullet confirmed, twin fizzled", {});
                }
              }

              // Kinetic damage scales with impact speed. Regular shots get a
              // mild bonus for exceeding baseline velocity (rewards the new
              // Projectile Speed stat); the Snail Mail Joker gets a much
              // steeper, exponential payoff since it's built entirely around
              // building up speed before impact.
              const impactSpeed = Math.hypot(proj.vx, proj.vy);
              const speedRatio = impactSpeed / BASE_PROJECTILE_SPEED;
              let effectiveDamage;
              if (proj.hasSnailMail) {
                effectiveDamage = Math.round(proj.damage * Math.pow(Math.max(speedRatio, 0.1), 1.8));
              } else {
                const speedBonus = Math.max(0, speedRatio - 1) * 0.4;
                effectiveDamage = Math.round(proj.damage * (1 + speedBonus));
              }
              effectiveDamage = Math.max(1, effectiveDamage);

              const isKilled = enemy.takeDamage(effectiveDamage);

              // Floating damage text
              this.floatingTexts.push(
                new FloatingText(enemy.x, enemy.y - 12, `${effectiveDamage}`, proj.isCrit ? "#f59e0b" : "#ffffff", 0.6)
              );

              // Handle explosive rounds (Plasma Warhead)
              if (proj.hasExplosion) {
                this.blastEffects.push(new BlastEffect(enemy.x, enemy.y, proj.blastRadius, "#f59e0b", 0.3));
                for (let otherIdx = 0; otherIdx < this.enemies.length; otherIdx++) {
                  const splashTarget = this.enemies[otherIdx];
                  if (splashTarget !== enemy && !splashTarget.isDestroyed) {
                    const splashDist = Math.hypot(splashTarget.x - enemy.x, splashTarget.y - enemy.y);
                    if (splashDist <= proj.blastRadius) {
                      const splashDmg = Math.round(effectiveDamage * 0.7);
                      const splashKilled = splashTarget.takeDamage(splashDmg);
                      this.floatingTexts.push(
                        new FloatingText(splashTarget.x, splashTarget.y - 10, `${splashDmg}`, "#f59e0b", 0.5)
                      );
                      if (splashKilled) {
                        this.handleEnemyDefeat(splashTarget);
                      }
                    }
                  }
                }
              }

              // Handle Chain Lightning
              if (proj.chainRemaining > 0) {
                let currentTarget = enemy;
                while (proj.chainRemaining > 0) {
                  let closestChainTarget = null;
                  let minChainDist = this.player.chainRange;

                  for (let cIdx = 0; cIdx < this.enemies.length; cIdx++) {
                    const candidate = this.enemies[cIdx];
                    if (!candidate.isDestroyed && !proj.hitEntities.has(candidate)) {
                      const cDist = Math.hypot(candidate.x - currentTarget.x, candidate.y - currentTarget.y);
                      if (cDist < minChainDist) {
                        minChainDist = cDist;
                        closestChainTarget = candidate;
                      }
                    }
                  }

                  if (closestChainTarget) {
                    proj.hitEntities.add(closestChainTarget);
                    proj.chainRemaining -= 1;
                    this.lightningArcs.push(
                      new LightningArc(currentTarget.x, currentTarget.y, closestChainTarget.x, closestChainTarget.y, "#a855f7", 0.22)
                    );
                    const chainDmg = Math.round(effectiveDamage * 0.75);
                    const chainKilled = closestChainTarget.takeDamage(chainDmg);
                    this.floatingTexts.push(
                      new FloatingText(closestChainTarget.x, closestChainTarget.y - 12, `${chainDmg}`, "#a855f7", 0.5)
                    );
                    if (chainKilled) {
                      this.handleEnemyDefeat(closestChainTarget);
                    }
                    currentTarget = closestChainTarget;
                  } else {
                    break;
                  }
                }
              }

              if (isKilled) {
                this.handleEnemyDefeat(enemy);
              }

              // Check piercing
              if (proj.pierceRemaining > 0) {
                proj.pierceRemaining -= 1;
                logDebug(3, "Projectile pierced through enemy", { remaining: proj.pierceRemaining });
              } else {
                proj.isDestroyed = true;

                // Fragmentation: on the FINAL impact (after any piercing is
                // used up), a projectile with fragmentation > 0 shatters into
                // shrapnel shards. Fragments never fragment further.
                if (!proj.isFragment && this.player.fragmentation > 0) {
                  this.spawnFragments(proj, effectiveDamage, impactSpeed);
                }
              }

              if (proj.isDestroyed) break;
            }
          }
        }

        // 2. Enemy Projectiles vs Player
        for (let epIdx = 0; epIdx < this.enemyProjectiles.length; epIdx++) {
          const bullet = this.enemyProjectiles[epIdx];
          if (bullet.isDestroyed) continue;

          const dist = Math.hypot(bullet.x - this.player.x, bullet.y - this.player.y);
          if (dist < bullet.radius + this.player.radius) {
            bullet.isDestroyed = true;
            const damaged = this.player.takeDamage(bullet.damage);
            if (damaged) {
              this.floatingTexts.push(
                new FloatingText(this.player.x, this.player.y - 14, `-${bullet.damage} HP`, "#ef4444", 0.7)
              );
              this.updateHUD();
              if (this.player.health <= 0) {
                this.triggerGameOver();
                return;
              }
            }
          }
        }

        // 3. Enemies colliding with Player
        for (let eIdx = 0; eIdx < this.enemies.length; eIdx++) {
          const enemy = this.enemies[eIdx];
          if (enemy.isDestroyed) continue;

          const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
          if (dist < enemy.radius + this.player.radius) {
            const hitDamage = enemy.isBoss ? 28 : 16;
            const damaged = this.player.takeDamage(hitDamage);
            if (damaged) {
              this.floatingTexts.push(
                new FloatingText(this.player.x, this.player.y - 14, `-${hitDamage} HP`, "#ef4444", 0.7)
              );
              this.updateHUD();
              if (this.player.health <= 0) {
                this.triggerGameOver();
                return;
              }
            }
          }
        }

        // 4. Player collecting Dropped Items (XP Squares and Boss Caches)
        for (let iIdx = 0; iIdx < this.droppedItems.length; iIdx++) {
          const item = this.droppedItems[iIdx];
          if (item.isDestroyed) continue;

          const dist = Math.hypot(item.x - this.player.x, item.y - this.player.y);
          if (dist < item.size + this.player.radius + 6) {
            item.isDestroyed = true;
            this.currentXp += item.value;
            this.totalScore += item.value * 25;

            // Visual text popup
            this.floatingTexts.push(
              new FloatingText(
                item.x,
                item.y - 10,
                item.isBossCache ? `+${item.value} BOSS CACHE` : `+${item.value} XP`,
                item.isBossCache ? "#fbbf24" : "#34d399",
                0.7
              )
            );

            logDebug(2, "Item collected by player", {
              itemValue: item.value,
              currentXp: this.currentXp,
              threshold: this.xpThreshold
            });

            this.updateHUD();

            // Check if Level Up threshold reached - automatically pops up upgrade selection card overlay
            if (this.currentXp >= this.xpThreshold) {
              this.triggerLevelUp();
              return;
            }
          }
        }
      }

      /**
       * Clean entity disposal: Iterates backwards through all entity arrays
       * and splices out destroyed or out-of-bounds items cleanly without index skipping.
       *
       * How to call:
       *   this.cleanDestroyedEntities();
       *
       * @returns {void}
       */
      cleanDestroyedEntities() {
        // Player Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
          const p = this.projectiles[i];
          if (p.isDestroyed || p.isOutOfBounds(this.width, this.height)) {
            this.projectiles.splice(i, 1);
          }
        }

        // Enemy Projectiles
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
          const ep = this.enemyProjectiles[i];
          if (ep.isDestroyed || ep.isOutOfBounds(this.width, this.height)) {
            this.enemyProjectiles.splice(i, 1);
          }
        }

        // Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.isDestroyed) {
            if (e === this.activeBoss) {
              this.activeBoss = null;
            }
            this.enemies.splice(i, 1);
          }
        }

        // Dropped Items
        for (let i = this.droppedItems.length - 1; i >= 0; i--) {
          const item = this.droppedItems[i];
          if (item.isDestroyed) {
            this.droppedItems.splice(i, 1);
          }
        }

        // Floating combat texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
          if (this.floatingTexts[i].isDestroyed) {
            this.floatingTexts.splice(i, 1);
          }
        }

        // Lightning arc visual effects
        for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
          if (this.lightningArcs[i].isDestroyed) {
            this.lightningArcs.splice(i, 1);
          }
        }

        // Plasma blast visual effects
        for (let i = this.blastEffects.length - 1; i >= 0; i--) {
          if (this.blastEffects[i].isDestroyed) {
            this.blastEffects.splice(i, 1);
          }
        }
      }

      /**
       * Updates game entities according to elapsed frame delta time.
       *
       * How to call:
       *   this.updateEntities(dt);
       *
       * @param {number} dt - Frame delta time in seconds.
       * @returns {void}
       */
      updateEntities(dt) {
        if (this.bossWarningTimer > 0) {
          this.bossWarningTimer -= dt;
          if (this.bossWarningTimer <= 0) {
            this.bossWarningTimer = 0;
            this.spawnBoss();
          }
        }

        this.player.update(dt, this.activeKeys, this.width, this.height);

        for (let i = 0; i < this.projectiles.length; i++) {
          this.projectiles[i].update(dt, this.width, this.height);
        }

        for (let i = 0; i < this.enemyProjectiles.length; i++) {
          this.enemyProjectiles[i].update(dt);
        }

        for (let i = 0; i < this.enemies.length; i++) {
          const enemy = this.enemies[i];
          enemy.update(dt, this.player.x, this.player.y, this.enemyProjectiles);
        }

        for (let i = 0; i < this.droppedItems.length; i++) {
          this.droppedItems[i].update(dt, this.player.x, this.player.y, this.player.magnetRadius);
        }

        for (let i = 0; i < this.floatingTexts.length; i++) {
          this.floatingTexts[i].update(dt);
        }

        for (let i = 0; i < this.lightningArcs.length; i++) {
          this.lightningArcs[i].update(dt);
        }

        for (let i = 0; i < this.blastEffects.length; i++) {
          this.blastEffects[i].update(dt);
        }
      }

      /**
       * Refreshes DOM HUD telemetry elements.
       *
       * How to call:
       *   this.updateHUD();
       *
       * @returns {void}
       */
      updateHUD() {
        if (this.hudSector) {
          const sectorNumber = String(Math.floor((this.playerLevel - 1) / 3) + 1).padStart(2, "0");
          this.hudSector.textContent = `SECTOR-${sectorNumber}`;
        }
        if (this.hudScore) this.hudScore.textContent = this.totalScore.toString();
        if (this.hudKills) this.hudKills.textContent = this.totalKills.toString();
        if (this.hudHp) this.hudHp.textContent = `${this.player.health} / ${this.player.maxHealth}`;
        if (this.hudLevel) this.hudLevel.textContent = this.playerLevel.toString();
        if (this.hudXp) this.hudXp.textContent = `${this.currentXp} / ${this.xpThreshold}`;
        if (this.hudRange) this.hudRange.textContent = `${Math.round(this.player.weaponRange)}px`;
        if (this.hudUpgrades) {
          const count = this.player.acquiredUpgrades ? this.player.acquiredUpgrades.length : 0;
          this.hudUpgrades.textContent = count.toString();
        }
      }

      /**
       * Handles the moment a Balatro Joker card finishes its pickup burn
       * animation. Reveals the (previously fully hidden, zero-footprint)
       * joker rack above the HUD the FIRST time this ever happens — which
       * slides the whole game area down via CSS transition on the rack's
       * max-height/opacity/margin — then fills the next empty slot with a
       * mini card that floats/hovers exactly like the level-up Joker cards,
       * and wires up hover -> Balatro-style DOM tooltip.
       *
       * How to call:
       *   this.onJokerAcquired(chosenJokerCard);
       *
       * @param {Object} card - The joker definition from UpgradeManager.jokerCatalog.
       * @returns {void}
       */
      onJokerAcquired(card) {
        if (!this.player.acquiredJokers) this.player.acquiredJokers = [];
        this.player.acquiredJokers.push(card);

        const rack = document.getElementById("balatro-joker-rack");
        if (rack && !rack.classList.contains("joker-rack-active")) {
          // First Joker ever acquired: reveal the rack. Up until this exact
          // moment there has been zero DOM footprint or visual hint that
          // this system exists at all.
          rack.classList.add("joker-rack-active");
          logDebug(1, "First Balatro Joker acquired — revealing joker rack (sliding game area down)", {});
        }

        const slotIndex = this.player.acquiredJokers.length - 1;
        const slotEl = document.getElementById(`jokerSlot${slotIndex}`);
        if (slotEl) {
          slotEl.classList.remove("empty");
          const variantClass = card.id === "joker_superposition" ? "superposition" : "";
          slotEl.innerHTML = `
            <div class="joker-mini-card ${variantClass}" data-joker-id="${card.id}">
              <div class="joker-mini-corner top-left">J</div>
              <canvas class="joker-mini-thumb" width="38" height="38"></canvas>
              <div class="joker-mini-title">${card.title}</div>
              <div class="joker-mini-corner bottom-right">J</div>
            </div>
          `;

          const miniCanvas = slotEl.querySelector("canvas.joker-mini-thumb");
          if (miniCanvas) {
            drawJokerPixelArt(miniCanvas.getContext("2d"), card.id, 0, 0, 38, 38);
          }

          const cardEl = slotEl.querySelector(".joker-mini-card");
          if (cardEl) {
            cardEl.addEventListener("mouseenter", () => this.showJokerTooltip(card, cardEl));
            cardEl.addEventListener("mouseleave", () => this.hideJokerTooltip());
          }
        }

        const counterLabel = document.getElementById("jokerCountLabel");
        if (counterLabel) counterLabel.textContent = `${this.player.acquiredJokers.length} / 5`;
      }

      /**
       * Displays the floating Balatro-style DOM tooltip anchored beneath a
       * hovered joker rack card, styled identically to the canvas tooltip
       * used during the level-up card selection screen.
       *
       * How to call:
       *   this.showJokerTooltip(card, cardEl);
       *
       * @param {Object} card - Joker definition (title, rarityTier, description).
       * @param {HTMLElement} anchorEl - The .joker-mini-card element being hovered.
       * @returns {void}
       */
      showJokerTooltip(card, anchorEl) {
        const tooltip = document.getElementById("balatro-dom-tooltip");
        const titleEl = document.getElementById("bTooltipTitle");
        const descEl = document.getElementById("bTooltipDesc");
        const rarityEl = document.getElementById("bTooltipRarity");
        if (!tooltip || !titleEl || !descEl || !rarityEl) return;

        titleEl.textContent = card.title;
        descEl.textContent = card.description;
        rarityEl.textContent = card.rarityTier;
        rarityEl.className = `b-badge rarity-${card.rarityTier.toLowerCase()}`;

        const rect = anchorEl.getBoundingClientRect();
        const tooltipWidth = 260;
        let left = rect.left + rect.width / 2 - tooltipWidth / 2;
        left = Math.max(8, Math.min(window.innerWidth - tooltipWidth - 8, left));
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${rect.bottom + 10}px`;

        tooltip.classList.remove("balatro-tooltip-hidden");
        tooltip.classList.add("visible");
      }

      /**
       * Hides the DOM joker tooltip.
       *
       * How to call:
       *   this.hideJokerTooltip();
       *
       * @returns {void}
       */
      hideJokerTooltip() {
        const tooltip = document.getElementById("balatro-dom-tooltip");
        if (tooltip) tooltip.classList.remove("visible");
      }

      /**
       * Renders the geometric coordinate background grid and top XP bar.
       *
       * How to call:
       *   this.renderArenaGrid();
       *
       * @returns {void}
       */
      renderArenaGrid() {
        this.ctx.save();
        this.ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
        this.ctx.lineWidth = 1;

        const cellSize = 40;
        for (let x = 0; x <= this.width; x += cellSize) {
          this.ctx.beginPath();
          this.ctx.moveTo(x, 0);
          this.ctx.lineTo(x, this.height);
          this.ctx.stroke();
        }
        for (let y = 0; y <= this.height; y += cellSize) {
          this.ctx.beginPath();
          this.ctx.moveTo(0, y);
          this.ctx.lineTo(this.width, y);
          this.ctx.stroke();
        }

        // Sleek progressive XP indicator line along top edge
        const xpRatio = Math.min(1.0, this.currentXp / this.xpThreshold);
        this.ctx.fillStyle = "rgba(52, 211, 153, 0.85)";
        this.ctx.shadowColor = "#34d399";
        this.ctx.shadowBlur = 6;
        this.ctx.fillRect(0, 0, this.width * xpRatio, 3);
        this.ctx.shadowBlur = 0;

        this.ctx.restore();
      }

      /**
       * Draws dynamic targeting trajectory line to the nearest hostile target center.
       *
       * How to call:
       *   this.renderAimGuide();
       *
       * @returns {void}
       */
      renderAimGuide() {
        const target = this.findNearestEnemy(this.player.weaponRange);
        if (target.enemy !== null) {
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.setLineDash([4, 6]);
          this.ctx.moveTo(this.player.x, this.player.y);
          this.ctx.lineTo(target.enemy.x, target.enemy.y);
          this.ctx.strokeStyle = "rgba(251, 191, 36, 0.25)";
          this.ctx.lineWidth = 1.5;
          this.ctx.stroke();

          // Target reticle
          this.ctx.beginPath();
          this.ctx.arc(target.enemy.x, target.enemy.y, target.enemy.radius + 6, 0, Math.PI * 2);
          this.ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
          this.ctx.lineWidth = 1.5;
          this.ctx.stroke();
          this.ctx.restore();
        }
      }

      /**
       * Renders top boss health bar when a boss encounter is active.
       *
       * How to call:
       *   this.renderBossTopBar();
       *
       * @returns {void}
       */
      renderBossTopBar() {
        if (!this.activeBoss) return;

        const barW = 380;
        const barH = 10;
        const barX = (this.width - barW) / 2;
        const barY = 18;

        this.ctx.save();
        this.ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillStyle = "#f43f5e";
        this.ctx.fillText(this.activeBoss.name, this.width / 2, barY - 6);

        this.ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        this.ctx.fillRect(barX, barY, barW, barH);

        const ratio = Math.max(0, this.activeBoss.health / this.activeBoss.maxHealth);
        this.ctx.fillStyle = this.activeBoss.isEnraged ? "#ef4444" : "#ec4899";
        this.ctx.fillRect(barX, barY, barW * ratio, barH);

        this.ctx.strokeStyle = "#475569";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, barY, barW, barH);
        this.ctx.restore();
      }

      /**
       * Renders flashing boss warning banner.
       *
       * How to call:
       *   this.renderBossWarning();
       *
       * @returns {void}
       */
      renderBossWarning() {
        if (this.bossWarningTimer <= 0) return;

        const flash = Math.sin(performance.now() * 0.015) > 0;
        this.ctx.save();
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        this.ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        this.ctx.fillStyle = flash ? "#ef4444" : "#f59e0b";
        this.ctx.shadowColor = "#ef4444";
        this.ctx.shadowBlur = 16;
        this.ctx.fillText("WARNING: SECTOR TITAN APPROACHING", this.width / 2, 70);
        this.ctx.restore();
      }

      /**
       * Renders canvas overlays for READY and GAME_OVER states.
       *
       * How to call:
       *   this.renderOverlays();
       *
       * @returns {void}
       */
      renderOverlays() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        if (this.state === "READY") {
          this.ctx.save();
          this.ctx.fillStyle = "rgba(7, 10, 19, 0.85)";
          this.ctx.fillRect(0, 0, this.width, this.height);

          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";

          this.ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          this.ctx.fillStyle = "#ffffff";
          this.ctx.fillText("CANVAS ARENA SURVIVOR", centerX, centerY - 45);

          this.ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          this.ctx.fillStyle = "#94a3b8";
          this.ctx.fillText("Navigate with [W][A][S][D] & harvest dropped XP squares", centerX, centerY);

          this.ctx.font = "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          this.ctx.fillStyle = "#38bdf8";
          this.ctx.fillText("Select Brotato-style upgrades on level-up and purge escalating Titans", centerX, centerY + 24);

          this.ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          this.ctx.fillStyle = "#f1f5f9";
          this.ctx.fillText("PRESS WASD OR CLICK TO ENGAGE", centerX, centerY + 70);

          this.ctx.restore();
        } else if (this.state === "GAME_OVER") {
          this.ctx.save();
          this.ctx.fillStyle = "rgba(7, 10, 19, 0.90)";
          this.ctx.fillRect(0, 0, this.width, this.height);

          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";

          this.ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          this.ctx.fillStyle = "#f43f5e";
          this.ctx.shadowColor = "rgba(244, 63, 94, 0.5)";
          this.ctx.shadowBlur = 18;
          this.ctx.fillText("VESSEL DESTROYED", centerX, centerY - 45);

          this.ctx.font = "15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          this.ctx.fillStyle = "#cbd5e1";
          this.ctx.shadowBlur = 0;
          this.ctx.fillText(`Final Score: ${this.totalScore}  |  Hostiles Purged: ${this.totalKills}  |  Level: ${this.playerLevel}`, centerX, centerY);

          this.ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          this.ctx.fillStyle = "#38bdf8";
          this.ctx.fillText("CLICK CANVAS TO REINITIALIZE SIMULATION", centerX, centerY + 50);

          this.ctx.restore();
        }
      }

      /**
       * The stable requestAnimationFrame game loop.
       * Calculates elapsed delta time clamped to prevent simulation explosions.
       *
       * How to call:
       *   this.gameLoop(timestamp);
       *
       * @param {DOMHighResTimeStamp} currentTimestamp - Frame timestamp.
       * @returns {void}
       */
      gameLoop(currentTimestamp) {
        let dt = (currentTimestamp - this.lastTimestamp) / 1000.0;
        this.lastTimestamp = currentTimestamp;

        // Clamp delta time to maximum 0.1s (10 FPS baseline)
        if (dt > 0.1) {
          dt = 0.1;
        }

        logDebug(4, "Game loop frame tick", { dt, state: this.state });

        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Render Arena Background Grid and XP line
        this.renderArenaGrid();

        // 2. Active Simulation Update Branch
        if (this.state === "PLAYING") {
          this.spawnEnemies(dt);
          this.handleAutoCombat(dt);
          this.updateEntities(dt);
          this.checkCollisions();
          this.cleanDestroyedEntities();
        }

        // 3. Render Game Entities
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

        this.renderBossTopBar();
        this.renderBossWarning();

        // 4. Render State Machine Overlays
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

        // Schedule next frame
        this.animationFrameId = requestAnimationFrame((ts) => this.gameLoop(ts));
      }
    }

    /**
     * Initializes the canvas application and verifies DOM ready state.
     *
     * How to call:
     *   bootGame();
     *
     * @returns {void}
     */


/* INTEGRATED: core gameplay and pause/collision systems */
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
  this.worldWidth = Math.round(this.width * 1.5);
  this.worldHeight = Math.round(this.height * 1.5);
  this.player.x = this.worldWidth / 2;
  this.player.y = this.worldHeight / 2;
  this.cameraX = this.player.x - (this.width / BALTTATO_CAMERA_ZOOM) / 2;
  this.cameraY = this.player.y - (this.height / BALTTATO_CAMERA_ZOOM) / 2;
  this.spawnDirectorTimer = 0;
  balttatoOriginalInit.call(this);
};

const balttatoOriginalRestartGame = GameManager.prototype.restartGame;
GameManager.prototype.restartGame = function() {
  balttatoOriginalRestartGame.call(this);
  this.player.x = this.worldWidth / 2;
  this.player.y = this.worldHeight / 2;
  this.cameraX = this.player.x - (this.width / BALTTATO_CAMERA_ZOOM) / 2;
  this.cameraY = this.player.y - (this.height / BALTTATO_CAMERA_ZOOM) / 2;
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


/* INTEGRATED: progressive enemy director and spawn scaling */
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


/* INTEGRATED: health and boost HUD manager integration */
(function() {
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


/* INTEGRATED: randomized boss entry location */
(function() {
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
})();


/* INTEGRATED: dynamic world sizing and progression tuning */
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


/* INTEGRATED: pause stat panel and Joker rack integration */
(function() {
function balttatoPlayerStatValue(player, definition) {
  const value = Number(player[definition.key]);
  return Number.isFinite(value) ? definition.format(value) : "—";
}

function balttatoDrawPauseStats(game) {
  const ctx = game.ctx;
  const centerX = game.width / 2;
  const centerY = game.height / 2;
  const panelX = centerX - 330;
  const panelY = centerY + 38;
  const panelW = 660;
  const rowH = 21;
  const colW = 220;

  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, panelX, panelY, panelW, 8 * rowH + 18, 7);
  ctx.fill();
  ctx.stroke();

  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  for (let i = 0; i < BALTTATO_STAT_DEFINITIONS.length; i++) {
    const definition = BALTTATO_STAT_DEFINITIONS[i];
    const col = Math.floor(i / 8);
    const row = i % 8;
    const x = panelX + 14 + col * colW;
    const y = panelY + 14 + row * rowH;
    const hovered = game.pauseStatHover === i;

    ctx.fillStyle = hovered ? "#38bdf8" : "#94a3b8";
    ctx.fillText(definition.label, x, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(balttatoPlayerStatValue(game.player, definition), x + colW - 14, y);
    ctx.textAlign = "left";

    if (hovered) {
      const tooltipW = 310;
      const tooltipH = 54;
      let tooltipX = game.mouseX + 14;
      let tooltipY = game.mouseY + 14;
      if (tooltipX + tooltipW > game.width) tooltipX = game.width - tooltipW - 8;
      if (tooltipY + tooltipH > game.height) tooltipY = game.height - tooltipH - 8;
      ctx.fillStyle = "rgba(2, 6, 23, 0.98)";
      ctx.strokeStyle = "#38bdf8";
      drawRoundedRect(ctx, tooltipX, tooltipY, tooltipW, tooltipH, 5);
      ctx.fill();
      ctx.stroke();
      ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(definition.label, tooltipX + 10, tooltipY + 14);
      ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(definition.tooltip, tooltipX + 10, tooltipY + 33);
    }
  }
  ctx.restore();
}

const balttatoOriginalRenderOverlaysStats = GameManager.prototype.renderOverlays;
GameManager.prototype.renderOverlays = function() {
  balttatoOriginalRenderOverlaysStats.call(this);
  if (this.state === "PAUSED") balttatoDrawPauseStats(this);
};

const balttatoOriginalBindEventsStats = GameManager.prototype.bindEvents;
GameManager.prototype.bindEvents = function() {
  balttatoOriginalBindEventsStats.call(this);
  this.pauseStatHover = -1;
  this.canvas.addEventListener("mousemove", (e) => {
    if (this.state !== "PAUSED") {
      this.pauseStatHover = -1;
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = (e.clientX - rect.left) * (this.width / rect.width);
    this.mouseY = (e.clientY - rect.top) * (this.height / rect.height);

    const panelX = this.width / 2 - 330;
    const panelY = this.height / 2 + 38;
    const rowH = 21;
    const colW = 220;
    this.pauseStatHover = -1;

    for (let i = 0; i < BALTTATO_STAT_DEFINITIONS.length; i++) {
      const col = Math.floor(i / 8);
      const row = i % 8;
      const x = panelX + 14 + col * colW;
      const y = panelY + 14 + row * rowH;
      if (this.mouseX >= x && this.mouseX <= x + colW && this.mouseY >= y - 10 && this.mouseY <= y + 10) {
        this.pauseStatHover = i;
        break;
      }
    }
    this.canvas.style.cursor = this.pauseStatHover >= 0 ? "help" : "default";
  });
};
function balttatoRefreshJokerRack(game) {
  const rack = document.getElementById("balatro-joker-rack");
  const counterLabel = document.getElementById("jokerCountLabel");
  if (!rack) return;

  const jokers = game.player.acquiredJokers || [];
  rack.classList.toggle("joker-rack-active", jokers.length > 0);
  if (counterLabel) counterLabel.textContent = `${jokers.length} / 5`;

  for (let s = 0; s < 5; s++) {
    const slotEl = document.getElementById(`jokerSlot${s}`);
    if (!slotEl) continue;
    const card = jokers[s];
    slotEl.classList.toggle("empty", !card);
    if (!card) {
      slotEl.innerHTML = "";
      continue;
    }

    slotEl.innerHTML = `
      <div class="joker-mini-card ${card.id === "joker_superposition" ? "superposition" : ""}" data-joker-id="${card.id}">
        <div class="joker-mini-corner top-left">J</div>
        <canvas class="joker-mini-thumb" width="38" height="38"></canvas>
        <div class="joker-mini-title">${card.title}</div>
        <button type="button" class="joker-scrap-btn" title="Scrap Joker for 1 reroll token">SCRAP +1</button>
        <div class="joker-mini-corner bottom-right">J</div>
      </div>
    `;

    const miniCanvas = slotEl.querySelector("canvas.joker-mini-thumb");
    if (miniCanvas) drawJokerPixelArt(miniCanvas.getContext("2d"), card.id, 0, 0, 38, 38);

    const cardEl = slotEl.querySelector(".joker-mini-card");
    if (cardEl) {
      cardEl.addEventListener("mouseenter", () => game.showJokerTooltip(card, cardEl));
      cardEl.addEventListener("mouseleave", () => game.hideJokerTooltip());
    }

    const scrapButton = slotEl.querySelector(".joker-scrap-btn");
    if (scrapButton) {
      scrapButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (game.state === "GAME_OVER") return;
        game.player.acquiredJokers.splice(s, 1);
        game.rerollTokens = (game.rerollTokens || 0) + 1;
        game.player.hasSnailMailJoker = game.player.acquiredJokers.some((joker) => joker.id === "joker_snail_mail");
        game.player.hasSuperpositionJoker = game.player.acquiredJokers.some((joker) => joker.id === "joker_superposition");
        game.floatingTexts.push(new FloatingText(game.player.x, game.player.y - 32, "+1 REROLL", "#60a5fa", 0.9));
        game.hideJokerTooltip();
        balttatoRefreshJokerRack(game);
        logDebug(1, "Joker scrapped for reroll token", { rerollTokens: game.rerollTokens });
      });
    }
  }
}

const balttatoOriginalOnJokerAcquiredStats = GameManager.prototype.onJokerAcquired;
GameManager.prototype.onJokerAcquired = function(card) {
  balttatoOriginalOnJokerAcquiredStats.call(this, card);
  balttatoRefreshJokerRack(this);
};

const balttatoOriginalRestartGameStats = GameManager.prototype.restartGame;
GameManager.prototype.restartGame = function() {
  balttatoOriginalRestartGameStats.call(this);
  this.pauseStatHover = -1;
  balttatoRefreshJokerRack(this);
};
})();


/* INTEGRATED: 1000x750 logical game viewport */
// The intended game viewport is 25% larger than the original 800x600 frame.
// Keep the logical dimensions in GameManager so the simulation, camera, mouse
// coordinates, world scaling, and overlays all use the same coordinate space.
const BALTTATO_GAME_WIDTH = 1000;
const BALTTATO_GAME_HEIGHT = 750;
const balttatoOriginalGameManagerClass = GameManager;
GameManager = class extends balttatoOriginalGameManagerClass {
      constructor(canvas) {
        super(canvas);
        this.width = BALTTATO_GAME_WIDTH;
        this.height = BALTTATO_GAME_HEIGHT;
        this.player.x = this.width / 2;
        this.player.y = this.height / 2;
      }
    };
