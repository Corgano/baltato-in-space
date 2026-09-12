class UpgradeManager {
      /**
       * Constructs the UpgradeManager catalog of player augmentations.
       *
       * How to call:
       *   const upgradeMgr = new UpgradeManager();
       */
      constructor() {
        this.upgradeCatalog = [
          {
            id: "chain_hits",
            title: "CHAIN LIGHTNING",
            tierName: "RARE",
            rarityColor: "#a855f7",
            description: "Projectiles discharge electric arcs chaining to +1 nearby hostile",
            apply: (player) => {
              player.chainHits += 1;
              logDebug(1, "Upgrade applied: CHAIN LIGHTNING", { chainHits: player.chainHits });
            }
          },
          {
            id: "multishot",
            title: "SPREAD VOLLEY",
            tierName: "RARE",
            rarityColor: "#a855f7",
            description: "Adds +1 additional projectile per firing cycle in spread",
            apply: (player) => {
              player.multishotCount += 1;
              logDebug(1, "Upgrade applied: SPREAD VOLLEY", { multishot: player.multishotCount });
            }
          },
          {
            id: "overclock_speed",
            title: "AGILITY THRUSTERS",
            tierName: "COMMON",
            rarityColor: "#38bdf8",
            description: "Increases vessel flight velocity by +25 px/sec",
            apply: (player) => {
              player.speed += 25;
              logDebug(1, "Upgrade applied: AGILITY THRUSTERS", { speed: player.speed });
            }
          },
          {
            id: "ricochet",
            title: "KINETIC RICOCHET",
            tierName: "RARE",
            rarityColor: "#a855f7",
            description: "Projectiles bounce off screen arena perimeter walls +1 time",
            apply: (player) => {
              player.ricochetCount += 1;
              logDebug(1, "Upgrade applied: KINETIC RICOCHET", { ricochet: player.ricochetCount });
            }
          },
          {
            id: "explosive_rounds",
            title: "PLASMA WARHEAD",
            tierName: "EPIC",
            rarityColor: "#f59e0b",
            description: "Projectiles detonate on impact with a 45px area shockwave blast",
            apply: (player) => {
              player.hasExplosiveBlast = true;
              player.blastRadius = Math.min(85, player.blastRadius + 15);
              logDebug(1, "Upgrade applied: PLASMA WARHEAD", { blastRadius: player.blastRadius });
            }
          },
          {
            id: "nanite_siphon",
            title: "NANITE SIPHON",
            tierName: "UNCOMMON",
            rarityColor: "#34d399",
            description: "15% chance on enemy defeat to restore +8 hull integrity",
            apply: (player) => {
              player.lifeLeechChance = Math.min(0.5, player.lifeLeechChance + 0.15);
              logDebug(1, "Upgrade applied: NANITE SIPHON", { leechChance: player.lifeLeechChance });
            }
          },
          {
            id: "attack_speed",
            title: "RAPID CYCLER",
            tierName: "COMMON",
            rarityColor: "#38bdf8",
            description: "Reduces auto-combat cooldown interval by 18%",
            apply: (player) => {
              player.fireInterval = Math.max(0.14, player.fireInterval * 0.82);
              logDebug(1, "Upgrade applied: RAPID CYCLER", { newInterval: player.fireInterval });
            }
          },
          {
            id: "heavy_ordnance",
            title: "HEAVY ORDNANCE",
            tierName: "COMMON",
            rarityColor: "#38bdf8",
            description: "Increases projectile kinetic damage by +12",
            apply: (player) => {
              player.damage += 12;
              logDebug(1, "Upgrade applied: HEAVY ORDNANCE", { newDamage: player.damage });
            }
          },
          {
            id: "piercing_rounds",
            title: "RAILGUN CASING",
            tierName: "UNCOMMON",
            rarityColor: "#34d399",
            description: "Projectiles pierce through +1 additional hostile",
            apply: (player) => {
              player.pierceCount += 1;
              logDebug(1, "Upgrade applied: RAILGUN CASING", { pierce: player.pierceCount });
            }
          },
          {
            id: "vital_bulk",
            title: "TITANIUM PLATING",
            tierName: "UNCOMMON",
            rarityColor: "#34d399",
            description: "+30 Max Hull HP and instantly restores 40 HP",
            apply: (player) => {
              player.maxHealth += 30;
              player.heal(40);
              logDebug(1, "Upgrade applied: TITANIUM PLATING", { maxHp: player.maxHealth, hp: player.health });
            }
          },
          {
            id: "energy_shield",
            title: "REACTIVE ARMOR",
            tierName: "UNCOMMON",
            rarityColor: "#34d399",
            description: "Adds +3 flat damage mitigation to all hits",
            apply: (player) => {
              player.armor += 3;
              logDebug(1, "Upgrade applied: REACTIVE ARMOR", { armor: player.armor });
            }
          },
          {
            id: "vacuum_funnel",
            title: "MAGNETIC VORTEX",
            tierName: "COMMON",
            rarityColor: "#38bdf8",
            description: "Increases XP suction radius by +70 pixels",
            apply: (player) => {
              player.magnetRadius += 70;
              logDebug(1, "Upgrade applied: MAGNETIC VORTEX", { magnetRadius: player.magnetRadius });
            }
          },
          {
            id: "crit_overcharge",
            title: "OPTICAL AMPLIFIER",
            tierName: "RARE",
            rarityColor: "#a855f7",
            description: "Adds +15% Critical Chance dealing 2.5x damage",
            apply: (player) => {
              player.critChance += 0.15;
              player.critMultiplier = 2.5;
              logDebug(1, "Upgrade applied: OPTICAL AMPLIFIER", { critChance: player.critChance });
            }
          },
          {
            id: "targeting_sensor",
            title: "TARGETING SENSOR",
            tierName: "COMMON",
            rarityColor: "#38bdf8",
            description: "Extends weapon targeting range with diminishing returns (+22% base range scaling toward soft cap)",
            apply: (player) => {
              const headroom = Math.max(0, (RANGE_SOFT_CAP - player.weaponRange) / (RANGE_SOFT_CAP - BASE_WEAPON_RANGE));
              const bonus = Math.max(14, Math.round(BASE_WEAPON_RANGE * 0.22 * headroom));
              player.weaponRange = Math.min(RANGE_SOFT_CAP, player.weaponRange + bonus);
              logDebug(1, "Upgrade applied: TARGETING SENSOR", { weaponRange: player.weaponRange, bonus });
            }
          },
          {
            id: "focal_array",
            title: "FOCAL ARRAY",
            tierName: "RARE",
            rarityColor: "#a855f7",
            description: "Increases kinetic damage by +6 and extends targeting range (+30% base range scaling toward soft cap)",
            apply: (player) => {
              const headroom = Math.max(0, (RANGE_SOFT_CAP - player.weaponRange) / (RANGE_SOFT_CAP - BASE_WEAPON_RANGE));
              const bonus = Math.max(18, Math.round(BASE_WEAPON_RANGE * 0.30 * headroom));
              player.weaponRange = Math.min(RANGE_SOFT_CAP, player.weaponRange + bonus);
              player.damage += 6;
              logDebug(1, "Upgrade applied: FOCAL ARRAY", { weaponRange: player.weaponRange, damage: player.damage, bonus });
            }
          },
          {
            id: "accelerator_coils",
            title: "ACCELERATOR COILS",
            tierName: "COMMON",
            rarityColor: "#38bdf8",
            description: "Increases projectile flight speed by +20% (faster impacts hit harder)",
            apply: (player) => {
              player.projectileSpeed = Math.round(player.projectileSpeed * 1.20);
              logDebug(1, "Upgrade applied: ACCELERATOR COILS", { projectileSpeed: player.projectileSpeed });
            }
          },
          {
            id: "hypervelocity_cores",
            title: "HYPERVELOCITY CORES",
            tierName: "RARE",
            rarityColor: "#a855f7",
            description: "Increases projectile speed by +35% and extends targeting range (+18% base range scaling toward soft cap)",
            apply: (player) => {
              player.projectileSpeed = Math.round(player.projectileSpeed * 1.35);
              const headroom = Math.max(0, (RANGE_SOFT_CAP - player.weaponRange) / (RANGE_SOFT_CAP - BASE_WEAPON_RANGE));
              const bonus = Math.max(12, Math.round(BASE_WEAPON_RANGE * 0.18 * headroom));
              player.weaponRange = Math.min(RANGE_SOFT_CAP, player.weaponRange + bonus);
              logDebug(1, "Upgrade applied: HYPERVELOCITY CORES", { projectileSpeed: player.projectileSpeed, weaponRange: player.weaponRange });
            }
          },
          {
            id: "lucky_charm",
            title: "LUCKY CHARM",
            tierName: "UNCOMMON",
            rarityColor: "#34d399",
            description: "A mysterious talisman imbued with fortuitous energy. Permanently increases Luck (+1).",
            apply: (player) => {
              player.luck += 1;
              logDebug(1, "Upgrade applied: LUCKY CHARM", { luck: player.luck });
            }
          },
          {
            id: "shrapnel_casing",
            title: "SHRAPNEL CASING",
            tierName: "COMMON",
            rarityColor: "#38bdf8",
            description: "Projectiles shatter into +2 fragmentation shards on final impact; shard spread and pierce chance scale with impact speed",
            apply: (player) => {
              player.fragmentation += 2;
              logDebug(1, "Upgrade applied: SHRAPNEL CASING", { fragmentation: player.fragmentation });
            }
          },
          {
            id: "cluster_munitions",
            title: "CLUSTER MUNITIONS",
            tierName: "RARE",
            rarityColor: "#a855f7",
            description: "Projectiles shatter into +3 shards with +15% increased shard velocity and pierce chance",
            apply: (player) => {
              player.fragmentation += 3;
              player.projectileSpeed = Math.round(player.projectileSpeed * 1.15);
              logDebug(1, "Upgrade applied: CLUSTER MUNITIONS", { fragmentation: player.fragmentation, projectileSpeed: player.projectileSpeed });
            }
          }
        ];

        // Balatro Joker catalog: 1 in 200 chance to appear, out of place by design
        this.jokerCatalog = [
          {
            id: "joker_snail_mail",
            isJoker: true,
            title: "Snail Mail",
            tierName: "JOKER",
            rarityTier: "UNCOMMON",
            rarityColor: "#ef4444",
            imageSrc: "/joker_snail_mail.jpg",
            tagline: "Postage due: Paid in blunt force.",
            description: "Starts at 1/3 base velocity, accelerating in flight. Kinetic impact damage scales up exponentially with final hit speed.",
            apply: (player) => {
              player.hasSnailMailJoker = true;
              logDebug(1, "Balatro Joker activated: Snail Mail", { hasSnailMailJoker: true });
            }
          },
          {
            id: "joker_superposition",
            isJoker: true,
            title: "Superposition",
            tierName: "JOKER",
            rarityTier: "RARE",
            rarityColor: "#06b6d4",
            imageSrc: "/joker_superposition.jpg",
            tagline: "Indeterminate until measured... with your face.",
            description: "Doubles projectile count with entangled pairs. When one hits, 50% chance to be real; the fake collapses while the other continues.",
            apply: (player) => {
              player.hasSuperpositionJoker = true;
              logDebug(1, "Balatro Joker activated: Superposition", { hasSuperpositionJoker: true });
            }
          }
        ];

        // Note: Joker card art is generated procedurally on-canvas (see
        // drawJokerPixelArt) rather than loaded from external image files,
        // so there's nothing to preload here. this.jokerImages is kept as an
        // empty lookup so drawOverlay's "loaded image" fast-path is simply
        // always skipped in favor of the pixel-art fallback.
        this.jokerImages = {};

        this.activeCards = [];
        this.hoveredCardIndex = -1;

        logDebug(1, "UpgradeManager catalog initialized", {
          totalCards: this.upgradeCatalog.length,
          totalJokers: this.jokerCatalog.length
        });
      }

      /**
       * Selects 3 distinct random upgrades from the catalog to present on level up.
       * Has an authentic 1 in 200 chance (0.5%) to substitute a slot with a Balatro Joker.
       *
       * How to call:
       *   upgradeMgr.generateOfferings(forceJoker);
       *
       * @param {boolean} [forceJoker=false] - For test button verification.
       * @returns {Array<Object>} Array of 3 distinct upgrade objects.
       */
      generateOfferings(forceJoker = false) {
        const pool = [...this.upgradeCatalog];
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        this.activeCards = pool.slice(0, 3);

        // 1 in 200 chance (0.005) or explicit forced test trigger
        const roll = Math.random();
        const shouldSpawnJoker = forceJoker || (roll < 0.005);
        if (shouldSpawnJoker) {
          const chosenJoker = this.jokerCatalog[Math.floor(Math.random() * this.jokerCatalog.length)];
          const slot = Math.floor(Math.random() * 3);
          this.activeCards[slot] = { ...chosenJoker };
          logDebug(1, "1 IN 200 ROLL OCCURRED! A Balatro Joker has materialized in slot " + slot, {
            joker: chosenJoker.title
          });
        }

        this.hoveredCardIndex = -1;

        logDebug(1, "Brotato-style upgrade offerings generated", {
          choices: this.activeCards.map(c => c.title)
        });

        return this.activeCards;
      }

      /**
       * Computes card bounding rectangles for canvas rendering and hit-testing.
       *
       * How to call:
       *   const rects = upgradeMgr.getCardLayout(800, 600);
       *
       * @param {number} canvasW - Canvas width.
       * @param {number} canvasH - Canvas height.
       * @returns {Array<{ x: number, y: number, w: number, h: number }>}
       */
      getCardLayout(canvasW, canvasH) {
        const cardW = 210;
        const cardH = 245;
        const gap = 20;
        const totalW = cardW * 3 + gap * 2;
        const startX = (canvasW - totalW) / 2;
        const startY = canvasH / 2 - 85;

        const rects = [];
        for (let i = 0; i < 3; i++) {
          rects.push({
            x: startX + i * (cardW + gap),
            y: startY,
            w: cardW,
            h: cardH
          });
        }
        return rects;
      }

      /**
       * Determines which upgrade card contains the given coordinate.
       *
       * How to call:
       *   const idx = upgradeMgr.hitTest(mouseX, mouseY, 800, 600);
       *
       * @param {number} mx - Pointer X.
       * @param {number} my - Pointer Y.
       * @param {number} canvasW - Canvas width.
       * @param {number} canvasH - Canvas height.
       * @returns {number} Card index 0, 1, 2 or -1 if none hit.
       */
      hitTest(mx, my, canvasW, canvasH) {
        const rects = this.getCardLayout(canvasW, canvasH);
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
            return i;
          }
        }
        return -1;
      }

      /**
       * Applies chosen upgrade to player vessel.
       *
       * How to call:
       *   const ok = upgradeMgr.applyUpgrade(0, player);
       *
       * @param {number} index - 0, 1, or 2.
       * @param {Player} player - Target Player entity.
       * @returns {boolean} True if successfully applied.
       */
      applyUpgrade(index, player) {
        if (index >= 0 && index < this.activeCards.length) {
          const upgrade = this.activeCards[index];
          upgrade.apply(player);
          if (!player.acquiredUpgrades) player.acquiredUpgrades = [];
          player.acquiredUpgrades.push(upgrade.title);
          logDebug(1, `Upgrade chosen and integrated: ${upgrade.title}`);
          return true;
        }
        return false;
      }

      /**
       * Renders the Brotato-style upgrade selection interface overlay onto the canvas.
       * Supports authentic Balatro Joker card rendering, floating idle animation,
       * pixel-art canvas tooltips, and disintegration burn effects.
       *
       * How to call:
       *   upgradeMgr.drawOverlay(ctx, 800, 600, playerLevel, burnInfo);
       *
       * @param {CanvasRenderingContext2D} ctx - Canvas context.
       * @param {number} canvasW - Canvas width.
       * @param {number} canvasH - Canvas height.
       * @param {number} playerLevel - Current player level.
       * @param {Object|null} [burnInfo=null] - Disintegration burn animation state.
       * @returns {void}
       */
      drawOverlay(ctx, canvasW, canvasH, playerLevel, burnInfo = null) {
        ctx.save();

        // Dark dimming backdrop
        ctx.fillStyle = "rgba(7, 10, 19, 0.90)";
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Header Title
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillStyle = "#38bdf8";
        ctx.shadowColor = "rgba(56, 189, 248, 0.5)";
        ctx.shadowBlur = 14;
        ctx.fillText(`LEVEL UP REACHED: LEVEL ${playerLevel}`, canvasW / 2, canvasH / 2 - 148);

        ctx.font = "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.shadowBlur = 0;
        ctx.fillText("Select 1 augmentation to integrate into vessel circuitry:", canvasW / 2, canvasH / 2 - 118);

        // Render Upgrade Cards
        const rects = this.getCardLayout(canvasW, canvasH);
        let activeHoveredJokerCard = null;
        let activeHoveredJokerCoord = null;

        for (let i = 0; i < this.activeCards.length; i++) {
          const card = this.activeCards[i];
          const r = rects[i];
          const isHovered = (this.hoveredCardIndex === i);
          const isBurningThisCard = Boolean(burnInfo && burnInfo.active && burnInfo.cardIndex === i && card.isJoker);

          ctx.save();

          // If a Joker card is burning, fade unselected cards out smoothly
          if (burnInfo && burnInfo.active && !isBurningThisCard) {
            ctx.globalAlpha = Math.max(0, 1 - burnInfo.progress * 2.8);
          }

          if (card.isJoker) {
            // =================================================================
            // AUTHENTIC BALATRO JOKER PLAYING CARD RENDERING
            // =================================================================
            // Subtle idle float and tilt animation characteristic of Balatro
            const idleTime = Date.now() * 0.0028;
            let bobY = Math.sin(idleTime + i * 2.2) * 6;
            let tilt = Math.sin(idleTime * 0.8 + i * 1.7) * 0.032;

            // Authentic Balatro burn shake/vibration if this Joker is being consumed
            if (isBurningThisCard) {
              const burnProg = burnInfo.progress;
              const shakeAmp = 2.0 + burnProg * 6.5;
              bobY += (Math.random() - 0.5) * shakeAmp;
              tilt += (Math.random() - 0.5) * 0.07 * burnProg;
            }

            ctx.save();
            ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
            ctx.rotate(tilt);
            ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2) + bobY);

            // If this card is currently undergoing pickup burn disintegration, clip it from below
            let burnLineY = 0;
            if (isBurningThisCard) {
              burnLineY = r.y + r.h * (1 - burnInfo.progress);
              ctx.save();
              ctx.beginPath();
              ctx.rect(r.x - 24, r.y - 24, r.w + 48, Math.max(0, burnLineY - r.y + 24));
              ctx.clip();
            }

            // Outer card body - Cream vintage card paper
            ctx.fillStyle = "#faf5ea";
            if (isHovered && !burnInfo?.active) {
              ctx.shadowColor = card.rarityColor;
              ctx.shadowBlur = 24;
            } else {
              ctx.shadowColor = card.rarityColor;
              ctx.shadowBlur = 6;
            }
            drawRoundedRect(ctx, r.x, r.y, r.w, r.h, 10);
            ctx.fill();

            // Bold primary colored card perimeter border: Always rarity color, dimmer when not hovered
            const dimJokerBorder = hexToRgba(card.rarityColor, 0.60);
            ctx.strokeStyle = isHovered ? card.rarityColor : dimJokerBorder;
            ctx.lineWidth = isHovered ? 3.5 : 2.5;
            if (isHovered) {
              ctx.shadowColor = card.rarityColor;
              ctx.shadowBlur = 18;
            } else {
              ctx.shadowColor = card.rarityColor;
              ctx.shadowBlur = 4;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";

            // Subtle inner hairline border
            ctx.strokeStyle = "#e2d7c5";
            ctx.lineWidth = 1;
            drawRoundedRect(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 8);
            ctx.stroke();

            // Top-left pixelated corner marks: "J" + mini diamond pip
            ctx.font = "bold 13px monospace";
            ctx.fillStyle = card.rarityColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("J", r.x + 15, r.y + 16);
            ctx.fillText("♦", r.x + 15, r.y + 28);

            // Bottom-right inverted pixelated corner marks
            ctx.fillText("J", r.x + r.w - 15, r.y + r.h - 16);
            ctx.fillText("♦", r.x + r.w - 15, r.y + r.h - 28);

            // Header pill badge: [JOKER]
            ctx.fillStyle = card.rarityColor;
            drawRoundedRect(ctx, r.x + r.w / 2 - 28, r.y + 10, 56, 18, 4);
            ctx.fill();
            ctx.font = "bold 10px monospace";
            ctx.fillStyle = "#ffffff";
            ctx.fillText("JOKER", r.x + r.w / 2, r.y + 19);

            // Center pixel art frame
            const artW = 144;
            const artH = 126;
            const artX = r.x + (r.w - artW) / 2;
            const artY = r.y + 36;

            ctx.fillStyle = "#1e1e24";
            drawRoundedRect(ctx, artX, artY, artW, artH, 6);
            ctx.fill();

            ctx.strokeStyle = "#b59f77";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Render pixel art Joker artwork
            const jokerImg = this.jokerImages[card.id];
            if (jokerImg && jokerImg.complete && jokerImg.naturalWidth > 0) {
              ctx.save();
              ctx.imageSmoothingEnabled = false; // Pixel-perfect crispness
              ctx.beginPath();
              drawRoundedRect(ctx, artX + 2, artY + 2, artW - 4, artH - 4, 4);
              ctx.clip();
              ctx.drawImage(jokerImg, artX + 2, artY + 2, artW - 4, artH - 4);
              ctx.restore();
            } else {
              ctx.save();
              ctx.beginPath();
              drawRoundedRect(ctx, artX + 2, artY + 2, artW - 4, artH - 4, 4);
              ctx.clip();
              drawJokerPixelArt(ctx, card.id, artX + 2, artY + 2, artW - 4, artH - 4);
              ctx.restore();
            }

            // Beneath art: Card title banner (strictly no mechanics explanation on card face!)
            ctx.fillStyle = "#f3ede0";
            drawRoundedRect(ctx, r.x + 20, r.y + 172, r.w - 40, 26, 4);
            ctx.fill();
            ctx.strokeStyle = "#cbba9f";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.font = "bold 13px 'Courier New', monospace";
            ctx.fillStyle = "#1c1917";
            ctx.textAlign = "center";
            ctx.fillText(card.title.toUpperCase(), r.x + r.w / 2, r.y + 185);

            // Bottom action pill: Glows with rarity color on hover, dimmer when idle
            const btnW = r.w - 36;
            const btnH = 26;
            const btnX = r.x + 18;
            const btnY = r.y + r.h - 36;

            ctx.save();
            if (isHovered) {
              ctx.shadowColor = card.rarityColor;
              ctx.shadowBlur = 14;
              ctx.fillStyle = card.rarityColor;
            } else {
              ctx.shadowBlur = 0;
              ctx.fillStyle = "#292524";
            }
            drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 4);
            ctx.fill();

            if (!isHovered) {
              ctx.strokeStyle = hexToRgba(card.rarityColor, 0.45);
              ctx.lineWidth = 1;
              ctx.stroke();
            }
            ctx.restore();

            ctx.font = "bold 11px monospace";
            ctx.fillStyle = isHovered ? "#ffffff" : "#d6d3d1";
            ctx.fillText(isHovered ? "SELECT JOKER" : "HOVER FOR STATS", btnX + btnW / 2, btnY + btnH / 2);

            // If clipped for burn, restore the clip now and draw Balatro pixel fire frontier
            if (isBurningThisCard) {
              ctx.restore(); // restores burn clip

              // Authentic Balatro Chunky Pixel Fire Frontier along burnLineY
              const blockSize = 4;
              for (let bx = r.x - 4; bx <= r.x + r.w + 4; bx += blockSize) {
                const seed = Math.sin(bx * 0.45 + Date.now() * 0.016);
                const flameH = 6 + Math.floor((seed + 1) * 4) + Math.floor(Math.random() * 4);

                // Charred paper ash eating into unburnt edge
                ctx.fillStyle = "#18181b";
                ctx.fillRect(bx, burnLineY - 4, blockSize, 4);
                if (Math.random() > 0.45) {
                  ctx.fillStyle = "#27272a";
                  ctx.fillRect(bx, burnLineY - 8, blockSize, 4);
                }
                // Crimson fiery base
                ctx.fillStyle = "#dc2626";
                ctx.fillRect(bx, burnLineY - 2, blockSize, flameH * 0.85);
                // Vibrant orange flame mid
                ctx.fillStyle = "#ea580c";
                ctx.fillRect(bx, burnLineY - 1, blockSize, flameH * 0.6);
                // Blazing yellow crest
                ctx.fillStyle = "#facc15";
                ctx.fillRect(bx, burnLineY, blockSize, flameH * 0.35);
                // Incandescent white spark
                if (Math.random() > 0.5) {
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(bx, burnLineY + 1, blockSize, 2);
                }
              }
            }

            ctx.restore(); // restores translate/rotate

            // If card is hovered, save reference to render canvas tooltip on top of all cards
            if (isHovered && !burnInfo?.active) {
              activeHoveredJokerCard = card;
              activeHoveredJokerCoord = {
                x: i === 2 ? r.x - 275 : r.x + r.w + 14,
                y: r.y + 10
              };
            }
          } else {
            // =================================================================
            // STANDARD SCI-FI BROTATO-STYLE UPGRADE CARD
            // =================================================================
            ctx.fillStyle = isHovered ? "#162032" : "#0f172a";
            drawRoundedRect(ctx, r.x, r.y, r.w, r.h, 6);
            ctx.fill();

            // Card outline: The border color is always the card's rarity color.
            // When not hovered, it is dimmer and less glowy; when hovered, it shows at full glow.
            const dimBorderColor = hexToRgba(card.rarityColor, 0.45);
            ctx.strokeStyle = isHovered ? card.rarityColor : dimBorderColor;
            ctx.lineWidth = isHovered ? 2.5 : 1.5;
            if (isHovered) {
              ctx.shadowColor = card.rarityColor;
              ctx.shadowBlur = 18;
            } else {
              ctx.shadowColor = card.rarityColor;
              ctx.shadowBlur = 4;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";

            // Keyboard shortcut pill [1], [2], [3] (carefully balanced without leaked save)
            ctx.fillStyle = "#1e293b";
            drawRoundedRect(ctx, r.x + 12, r.y + 12, 28, 20, 3);
            ctx.fill();
            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.font = "bold 11px monospace";
            ctx.fillStyle = "#f1f5f9";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`[${i + 1}]`, r.x + 26, r.y + 22);

            // Rarity tag
            ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            ctx.textAlign = "right";
            ctx.fillStyle = card.rarityColor;
            ctx.fillText(card.tierName, r.x + r.w - 12, r.y + 22);

            // Card Title
            ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            ctx.textAlign = "center";
            ctx.fillStyle = "#ffffff";
            ctx.fillText(card.title, r.x + r.w / 2, r.y + 70);

            // Dividing line
            ctx.strokeStyle = "#1e293b";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(r.x + 16, r.y + 92);
            ctx.lineTo(r.x + r.w - 16, r.y + 92);
            ctx.stroke();

            // Description text
            ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            ctx.fillStyle = "#cbd5e1";
            ctx.textAlign = "center";

            const words = card.description.split(" ");
            let line = "";
            let lineY = r.y + 120;

            for (let wIdx = 0; wIdx < words.length; wIdx++) {
              const testLine = line + words[wIdx] + " ";
              const metrics = ctx.measureText(testLine);
              if (metrics.width > r.w - 30 && wIdx > 0) {
                ctx.fillText(line.trim(), r.x + r.w / 2, lineY);
                line = words[wIdx] + " ";
                lineY += 18;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line.trim(), r.x + r.w / 2, lineY);

            // Action button base: Glows with full rarity color when card is hovered
            const btnW = r.w - 32;
            const btnH = 30;
            const btnX = r.x + 16;
            const btnY = r.y + r.h - 42;

            ctx.save();
            if (isHovered) {
              // Making the click to equip button glow with the card's rarity color
              ctx.shadowColor = card.rarityColor;
              ctx.shadowBlur = 16;
              ctx.fillStyle = card.rarityColor;
            } else {
              ctx.shadowBlur = 0;
              ctx.fillStyle = "#1e293b";
            }
            drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 4);
            ctx.fill();

            // When not hovered, give button outline a subtle matching dim rarity color
            if (!isHovered) {
              ctx.strokeStyle = hexToRgba(card.rarityColor, 0.35);
              ctx.lineWidth = 1;
              ctx.stroke();
            }
            ctx.restore();

            ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            ctx.fillStyle = isHovered ? "#000000" : "#94a3b8";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(isHovered ? "SELECT UPGRADE" : "CLICK TO EQUIP", btnX + btnW / 2, btnY + btnH / 2);
          }

          ctx.restore();
        }

        // =====================================================================
        // AUTHENTIC BALATRO CHUNKY SQUARE PIXEL EMBER PARTICLES
        // =====================================================================
        if (burnInfo && burnInfo.active && burnInfo.embers && burnInfo.embers.length > 0) {
          ctx.save();
          for (let emIdx = 0; emIdx < burnInfo.embers.length; emIdx++) {
            const ember = burnInfo.embers[emIdx];
            const lifeRatio = Math.max(0, ember.life / (ember.maxLife || 0.5));

            // Balatro pixel color cooling shift: white -> yellow -> orange -> crimson
            let emberColor = "#b91c1c";
            if (lifeRatio > 0.65) emberColor = "#ffffff";
            else if (lifeRatio > 0.4) emberColor = "#facc15";
            else if (lifeRatio > 0.2) emberColor = "#f97316";

            ctx.fillStyle = emberColor;
            ctx.fillRect(Math.round(ember.x), Math.round(ember.y), ember.size, ember.size);
          }
          ctx.restore();
        }

        // =====================================================================
        // BALATRO CANVAS HOVER TOOLTIP
        // =====================================================================
        if (activeHoveredJokerCard && activeHoveredJokerCoord) {
          this.drawBalatroCanvasTooltip(
            ctx,
            activeHoveredJokerCard,
            activeHoveredJokerCoord.x,
            activeHoveredJokerCoord.y
          );
        }

        ctx.restore();
      }

      /**
       * Renders an authentic Balatro-style canvas tooltip when hovering over a Joker card.
       *
       * How to call:
       *   upgradeMgr.drawBalatroCanvasTooltip(ctx, card, 300, 150);
       *
       * @param {CanvasRenderingContext2D} ctx - Canvas rendering context.
       * @param {Object} card - Balatro Joker card object.
       * @param {number} x - Left coordinate.
       * @param {number} y - Top coordinate.
       * @returns {void}
       */
      drawBalatroCanvasTooltip(ctx, card, x, y) {
        ctx.save();
        const tipW = 270;
        const tipH = 205;

        // Keep tooltip strictly bounded inside arena canvas
        const drawX = Math.max(12, Math.min(800 - tipW - 12, x));
        const drawY = Math.max(12, Math.min(600 - tipH - 12, y));

        // Dark charcoal Balatro tooltip background
        ctx.fillStyle = "#181c24";
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 24;
        drawRoundedRect(ctx, drawX, drawY, tipW, tipH, 8);
        ctx.fill();

        // Thick solid white border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "transparent";
        ctx.stroke();

        // Top badges row: [JOKER] + [RARITY]
        ctx.fillStyle = "#dc2626";
        drawRoundedRect(ctx, drawX + 14, drawY + 12, 54, 20, 4);
        ctx.fill();
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("JOKER", drawX + 41, drawY + 22);

        const isRare = card.rarityTier === "RARE";
        ctx.fillStyle = isRare ? "#8b5cf6" : "#10b981";
        drawRoundedRect(ctx, drawX + 74, drawY + 12, 82, 20, 4);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(card.rarityTier, drawX + 115, drawY + 22);

        // Title
        ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.fillText(card.title, drawX + 14, drawY + 54);

        // Divider
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(drawX + 14, drawY + 68);
        ctx.lineTo(drawX + tipW - 14, drawY + 68);
        ctx.stroke();

        // Pun / Vague flavor tagline
        ctx.font = "italic 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillStyle = "#fef08a";
        ctx.fillText(`"${card.tagline}"`, drawX + 14, drawY + 86);

        // Mechanics lines with high contrast highlighted stats
        ctx.font = "11.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillStyle = "#e2e8f0";

        if (card.id === "joker_snail_mail") {
          ctx.fillText("• Projectiles launch at 1/3 base velocity", drawX + 14, drawY + 110);
          ctx.fillText("• Accelerates continuously during flight", drawX + 14, drawY + 128);
          ctx.fillStyle = "#fb923c";
          ctx.fillText("• Impact damage scales exponentially", drawX + 14, drawY + 148);
          ctx.fillText("  with final impact velocity", drawX + 14, drawY + 164);
        } else {
          ctx.fillText("• Doubles projectiles into quantum pairs", drawX + 14, drawY + 110);
          ctx.fillText("• Entangled with slight direction offset", drawX + 14, drawY + 128);
          ctx.fillStyle = "#38bdf8";
          ctx.fillText("• 50% chance on hit to be the real bullet;", drawX + 14, drawY + 148);
          ctx.fillText("  fake collapses, twin continues flying", drawX + 14, drawY + 164);
        }

        ctx.restore();
      }
    }

    /**
     * =========================================================================
     * Class: GameManager
     * =========================================================================
     * Master controller for the arena survival simulation:
     * - Delta time measurement via requestAnimationFrame
     * - Distinct entity arrays (projectiles, enemyProjectiles, enemies, droppedItems, floatingTexts)
     * - Auto-combat target vector acquisition targeting closest hostile center
     * - Entity garbage collection (clean backwards splicing)
     * - Brotato-style level up upgrade integration
     * - Mathematical EXP leveling curve with surplus carryover
     * - Escalating boss encounters every 3 levels with custom attack mechanics
     * =========================================================================
     */




/* INTEGRATED: shared Luck curve helper */
function balttatoLuckCurve(luck, cap = 1) {
  return cap * (1 - Math.exp(-BALTTATO_LUCK_CURVE_RATE * Math.max(0, Number(luck) || 0)));
}

/* INTEGRATED: upgrade rarity, Joker recurrence, and Luck offering curves */
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





/* INTEGRATED: Boost Capacitor upgrade */
(function() {
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
})();


/* INTEGRATED: upgrade stat metadata and Luck-scaled Joker offerings */
(function() {
const BALTTATO_STAT_DEFINITIONS = [
  { key: "damage", label: "Damage", format: (v) => `${Math.round(v)}`, tooltip: "Base damage dealt by each projectile before critical hits and impact-speed bonuses." },
  { key: "fireInterval", label: "Fire Rate", format: (v) => `${v.toFixed(2)}s`, tooltip: "Time between automatic firing cycles. Lower is faster." },
  { key: "multishotCount", label: "Multishot", format: (v) => `${Math.round(v)}`, tooltip: "Projectiles fired in each automatic volley." },
  { key: "projectileSpeed", label: "Projectile Speed", format: (v) => `${Math.round(v)} px/s`, tooltip: "Flight speed of projectiles. Faster impacts receive a kinetic damage bonus." },
  { key: "weaponRange", label: "Range", format: (v) => `${Math.round(v)} px`, tooltip: "Maximum distance used when automatically acquiring targets." },
  { key: "pierceCount", label: "Penetration", format: (v) => `${Math.round(v)}`, tooltip: "Additional enemies a projectile can pass through before being destroyed." },
  { key: "fragmentation", label: "Fragmentation", format: (v) => `${Math.round(v)}`, tooltip: "Maximum fragmentation shards and the strength of penetration-fragment synergies." },
  { key: "chainHits", label: "Chain Lightning", format: (v) => `${Math.round(v)}`, tooltip: "Number of additional targets a projectile can chain to with lightning." },
  { key: "ricochetCount", label: "Ricochet", format: (v) => `${Math.round(v)}`, tooltip: "Number of times a projectile can bounce from the arena perimeter." },
  { key: "critChance", label: "Critical Chance", format: (v) => `${Math.round(v * 100)}%`, tooltip: "Chance for a projectile to deal its critical multiplier damage." },
  { key: "critMultiplier", label: "Critical Multiplier", format: (v) => `${v.toFixed(1)}x`, tooltip: "Damage multiplier applied when a critical hit occurs." },
  { key: "speed", label: "Movement", format: (v) => `${Math.round(v)} px/s`, tooltip: "Normal player movement speed. Boost temporarily doubles this value." },
  { key: "luck", label: "Luck", format: (v) => `${Math.round(v)}`, tooltip: "Improves rare-progression rolls, including Joker offers, reroll drops, chain effects, and bonus choices." },
  { key: "magnetRadius", label: "Pickup Radius", format: (v) => `${Math.round(v)} px`, tooltip: "Distance from which dropped XP is pulled toward the player." },
  { key: "maxHealth", label: "Max Hull", format: (v) => `${Math.round(v)}`, tooltip: "Maximum hull integrity. Hull upgrades also restore health when acquired." },
  { key: "armor", label: "Armor", format: (v) => `${Math.round(v)}`, tooltip: "Flat damage mitigation applied to incoming hits." },
  { key: "boostCapacity", label: "Boost Capacity", format: (v) => `${Math.round(v)}`, tooltip: "Maximum boost resource available while holding SHIFT during movement." },
  { key: "blastRadius", label: "Blast Radius", format: (v) => `${Math.round(v)} px`, tooltip: "Area reached by Plasma Warhead explosion waves." }
];

const BALTTATO_UPGRADE_STAT_EFFECTS = {
  chain_hits: ["Chain Lightning +1"],
  multishot: ["Multishot +1"],
  overclock_speed: ["Movement +25 px/s"],
  ricochet: ["Ricochet +1"],
  explosive_rounds: ["Plasma Warhead", "Blast Radius +15 px"],
  nanite_siphon: ["Life Leech +15%"],
  attack_speed: ["Fire Rate -18%"],
  heavy_ordnance: ["Damage +12"],
  piercing_rounds: ["Penetration +1"],
  vital_bulk: ["Max Hull +30", "Restore +40 Hull"],
  energy_shield: ["Armor +3"],
  vacuum_funnel: ["Pickup Radius +70 px"],
  crit_overcharge: ["Critical Chance +15%", "Critical Multiplier 2.5x"],
  targeting_sensor: ["Range +22% base scaling"],
  focal_array: ["Damage +6", "Range +30% base scaling"],
  accelerator_coils: ["Projectile Speed +20%"],
  hypervelocity_cores: ["Projectile Speed +35%", "Range +18% base scaling"],
  lucky_charm: ["Luck +1"],
  shrapnel_casing: ["Fragmentation +2"],
  cluster_munitions: ["Fragmentation +3", "Projectile Speed +15%"],
  boost_capacity: ["Boost Capacity +50", "Fully recharge Boost"]
};

function balttatoFormatUpgradeStats(upgrade) {
  const effects = BALTTATO_UPGRADE_STAT_EFFECTS[upgrade.id];
  return effects && effects.length > 0 ? `Stats: ${effects.join(" | ")}` : "";
}

// Make every catalog entry expose explicit stat effects without rewriting the
// existing upgrade implementations. The actual behaviors already consume the
// player stat fields; this layer makes those relationships visible to the UI.
const balttatoOriginalUpgradeManagerClass = UpgradeManager;
UpgradeManager = class extends balttatoOriginalUpgradeManagerClass {
  constructor() {
    super();
    for (let i = 0; i < this.upgradeCatalog.length; i++) {
      const upgrade = this.upgradeCatalog[i];
      upgrade.statEffects = BALTTATO_UPGRADE_STAT_EFFECTS[upgrade.id] || [];
    }
    for (let i = 0; i < this.jokerCatalog.length; i++) {
      this.jokerCatalog[i].statEffects = ["Joker passive"];
    }
  }
};

const balttatoOriginalGenerateOfferingsStats = UpgradeManager.prototype.generateOfferings;
const BALTTATO_JOKER_BASE_CHANCE = 0.0075;
const BALTTATO_JOKER_LUCK_CAP = 0.075;

function balttatoJokerOfferChance(luck) {
  const normalizedLuck = Math.max(0, Number(luck) || 0);
  const luckFactor = 1 - Math.exp(-0.2 * normalizedLuck);
  return Math.min(BALTTATO_JOKER_LUCK_CAP, BALTTATO_JOKER_BASE_CHANCE + (BALTTATO_JOKER_LUCK_CAP - BALTTATO_JOKER_BASE_CHANCE) * luckFactor);
}

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

  const jokerChance = balttatoJokerOfferChance(player ? player.luck : 0);
  if (forceJoker || (Math.random() < jokerChance && this.jokerCatalog.length > 0)) {
    const chosenJoker = this.jokerCatalog[Math.floor(Math.random() * this.jokerCatalog.length)];
    const slot = Math.floor(Math.random() * this.activeCards.length);
    this.activeCards[slot] = { ...chosenJoker };
    logDebug(1, "Balatro Joker offering generated", {
      joker: chosenJoker.title,
      chance: jokerChance,
      luck: player ? player.luck : 0,
      slot
    });
  }

  this.hoveredCardIndex = -1;
  return this.activeCards;
};

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

GameManager.prototype.rerollOfferings = function() {
  if (this.state !== "LEVEL_UP" || this.cardBurn.active || (this.rerollTokens || 0) <= 0) return false;
  this.rerollTokens -= 1;
  this.upgradeManager.generateOfferings(false, this.player);
  this.rerollButtonHover = false;
  logDebug(1, "Upgrade offerings rerolled", { rerollTokens: this.rerollTokens, choices: this.upgradeManager.activeCards.length });
  return true;
};

const balttatoOriginalUpgradeDrawOverlayStats = UpgradeManager.prototype.drawOverlay;
UpgradeManager.prototype.drawOverlay = function(ctx, canvasW, canvasH, playerLevel, burnInfo = null) {
  const descriptions = [];
  for (let i = 0; i < this.activeCards.length; i++) {
    const card = this.activeCards[i];
    descriptions.push(card.description);
    if (!card.isJoker) {
      const statText = balttatoFormatUpgradeStats(card);
      if (statText && !card.description.includes("Stats:")) card.description = `${card.description} — ${statText}`;
    }
  }

  try {
    balttatoOriginalUpgradeDrawOverlayStats.call(this, ctx, canvasW, canvasH, playerLevel, burnInfo);
  } finally {
    for (let i = 0; i < this.activeCards.length && i < descriptions.length; i++) {
      this.activeCards[i].description = descriptions[i];
    }
  }
};
})();


/* INTEGRATED: Joker card layout and idle animation tuning */
// Balatro-style Jokers use an exact 71x95 logical card design, rendered at a
// reduced height so the reward cards do not overlap the level-up instructions.
const BALTTATO_JOKER_BASE_WIDTH = 71;
const BALTTATO_JOKER_BASE_HEIGHT = 95;
const BALTTATO_JOKER_RENDER_SCALE = 3;
const BALTTATO_JOKER_WIDTH = BALTTATO_JOKER_BASE_WIDTH * BALTTATO_JOKER_RENDER_SCALE;
const BALTTATO_JOKER_HEIGHT = 255;

const balttatoOriginalUpgradeCardLayout = UpgradeManager.prototype.getCardLayout;
UpgradeManager.prototype.getCardLayout = function(canvasW, canvasH) {
      const cardW = BALTTATO_JOKER_WIDTH;
      const cardH = BALTTATO_JOKER_HEIGHT;
      const gap = 20;
      const totalW = cardW * 3 + gap * 2;
      const startX = (canvasW - totalW) / 2;
      // Keep the cards below the level-up heading/subheading instead of
      // vertically centering the taller cards over that text.
      const startY = canvasH / 2 - 85;

      const rects = [];
      for (let i = 0; i < 3; i++) {
        rects.push({
          x: startX + i * (cardW + gap),
          y: startY,
          w: cardW,
          h: cardH
        });
      }
      return rects;
    };


/* INTEGRATED: Joker overlay idle timing */
// Slow the Joker idle motion slightly and reduce its vertical float amplitude.
// The original renderer uses Date.now() for both the idle motion and burn effect;
// scaling the clock only while the overlay is drawn keeps the rest of the game
// timing untouched.
const balttatoOriginalUpgradeDrawOverlay = UpgradeManager.prototype.drawOverlay;
UpgradeManager.prototype.drawOverlay = function(ctx, canvasW, canvasH, playerLevel, burnInfo = null) {
      const originalDateNow = Date.now;
      const now = performance.now();
      Date.now = () => Math.floor(now * 0.72);
      try {
        return balttatoOriginalUpgradeDrawOverlay.call(this, ctx, canvasW, canvasH, playerLevel, burnInfo);
      } finally {
        Date.now = originalDateNow;
      }
    };
