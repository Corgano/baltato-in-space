/**
     * =========================================================================
     * NOT BROTATO - MINIMALIST TOP-DOWN ARENA SURVIVOR
     * =========================================================================
     * Architecture: Single-file native HTML5 Canvas application.
     * Core Mechanics:
     * 1. requestAnimationFrame loop with clamped delta-time calculations.
     * 2. Player entity managed with WASD keyboard input constrained to bounds.
     * 3. Autonomous target acquisition targeting nearest hostile entity center.
     * 4. Multi-entity arrays with safe garbage collection (backwards splicing).
     * 5. Brotato-style card selection upgrade system triggered on Level Up.
     * 6. Progressive mathematical EXP leveling curve with surplus carryover.
     * 7. Escalating Boss entities every 3 levels with bullet hell attack patterns.
     * 8. Five-tier logging system controlled by an integer debug flag.
     * =========================================================================
     */

    /**
     * Global Diagnostic Verbosity Level:
     * 0 = Errors only
     * 1 = Normal running / major milestones
     * 2 = Light debugging / verbose execution
     * 3 = Debug mode / telemetry comments
     * 4 = Flood console / frame-level inspection
     */
    let DEBUG_LEVEL = 1;

    /**
     * Reference baseline weapon targeting acquisition range in pixels.
     * Range upgrades scale additively as a percentage of this base value
     * (e.g. +20% of base range = +52px), creating steady, predictable
     * increases with natural diminishing relative returns as range climbs.
     */
    const BASE_WEAPON_RANGE = 260;

    /**
     * Ceiling cap for weapon targeting acquisition range in pixels.
     */
    const RANGE_SOFT_CAP = 680;

    /**
     * Reference projectile speed used as the 1.0x baseline for speed-based
     * damage scaling. Player.projectileSpeed starts at this value. Slower base
     * velocity ensures that speed upgrades and acceleration feel pronounced.
     */
    const BASE_PROJECTILE_SPEED = 340;

    /**
     * Maximum distance a normal projectile can travel before it despawns.
     * This is intentionally decoupled from player.weaponRange: weaponRange
     * only gates target ACQUISITION (how far the auto-turret will look for
     * an enemy to shoot at). Once fired, a projectile flies until it leaves
     * the arena or reaches this generous flight ceiling, so range upgrades
     * no longer feel like they are clipping bullets out of the air.
     */
    const PROJECTILE_FLIGHT_RANGE = 2000;

    /**
     * Centralized diagnostic logger conforming to strict verbosity tiers.
     *
     * How to call:
     *   logDebug(1, "Player initialized", { x: 100, y: 100 });
     *
     * @param {number} level - Required threshold integer (0 to 4).
     * @param {string} message - Primary log description.
     * @param {any} [data] - Optional contextual metadata.
     * @returns {void}
     */
    function logDebug(level, message, data) {
      if (level > DEBUG_LEVEL) return;

      const prefix = `[ARENA-DEBUG L${level}]`;
      if (level === 0) {
        if (data !== undefined) console.error(`${prefix} ${message}`, data);
        else console.error(`${prefix} ${message}`);
      } else if (level === 1) {
        if (data !== undefined) console.info(`${prefix} ${message}`, data);
        else console.info(`${prefix} ${message}`);
      } else {
        if (data !== undefined) console.log(`${prefix} ${message}`, data);
        else console.log(`${prefix} ${message}`);
      }
    }

    /**
     * Safely constructs a rounded rectangle path onto the 2D canvas context.
     * Guaranteed compatibility across all browser engines without relying on
     * the modern CanvasRenderingContext2D.prototype.roundRect method.
     *
     * How to call:
     *   drawRoundedRect(ctx, 50, 50, 200, 100, 8);
     *   ctx.fill();
     *
     * @param {CanvasRenderingContext2D} ctx - Target 2D rendering context.
     * @param {number} x - Horizontal upper-left origin coordinate.
     * @param {number} y - Vertical upper-left origin coordinate.
     * @param {number} w - Rectangle bounding width in pixels.
     * @param {number} h - Rectangle bounding height in pixels.
     * @param {number} r - Corner radius in pixels.
     * @returns {void}
     */
    function drawRoundedRect(ctx, x, y, w, h, r) {
      if (r > w / 2) r = w / 2;
      if (r > h / 2) r = h / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    /**
     * Converts a 3 or 6 character hexadecimal color string into an rgba(...) CSS color string.
     * Used to produce dimmed, semi-transparent variations of rarity colors for card borders
     * and non-hovered UI elements.
     *
     * How to call:
     *   const dimColor = hexToRgba("#38bdf8", 0.45);
     *
     * @param {string} hex - Hexadecimal color code (e.g. "#38bdf8").
     * @param {number} alpha - Opacity fraction from 0.0 to 1.0.
     * @returns {string} RGBA formatted color string (e.g. "rgba(56, 189, 248, 0.45)").
     */
    function hexToRgba(hex, alpha) {
      if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
        return hex;
      }
      let c = hex.slice(1);
      if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      }
      if (c.length !== 6) {
        return hex;
      }
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Draws small, deliberately blocky/pixelated procedural artwork for a
     * Balatro Joker onto a 2D canvas context. Used both for the joker rack's
     * mini-card thumbnail and for the big level-up card face (this build
     * generates its own joker art rather than loading external image files).
     *
     * How to call:
     *   drawJokerPixelArt(ctx, "joker_snail_mail", 0, 0, 38, 38);
     *
     * @param {CanvasRenderingContext2D} ctx - Target context.
     * @param {string} jokerId - Joker catalog id.
     * @param {number} x - Destination x.
     * @param {number} y - Destination y.
     * @param {number} w - Destination width.
     * @param {number} h - Destination height.
     * @returns {void}
     */
    const JOKER_PIXEL_ART = {
      joker_snail_mail: {
        rows: [
          "....2222......",
          "...233332.....",
          "..231111132...",
          "..2311..032...",
          "..2311..032...",
          "..2311003222..",
          "..22333323322.",
          "...444444444..",
          "..44444444444.",
          ".4444444444444",
          "64..........46"
        ],
        colors: { "2": "#b5651d", "3": "#d9a066", "1": "#7c4a1e", "0": "#f4c78a", "4": "#6b8e4e", "6": "#1a1a1a" }
      },
      joker_superposition: {
        rows: [
          ".....11.....",
          "....1..1....",
          "...1....1...",
          "..1..22..1..",
          ".1..2222..1.",
          "1..222222..1",
          "1..222222..1",
          ".1..2222..1.",
          "..1..22..1..",
          "...1....1...",
          "....1..1....",
          ".....11....."
        ],
        colors: { "1": "#22d3ee", "2": "#67e8f9" }
      }
    };

    function drawJokerPixelArt(ctx, jokerId, x, y, w, h) {
      const def = JOKER_PIXEL_ART[jokerId];
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#14141a";
      ctx.fillRect(x, y, w, h);

      if (def) {
        const rows = def.rows;
        const cols = rows[0].length;
        const cellW = w / cols;
        const cellH = h / rows.length;
        for (let ry = 0; ry < rows.length; ry++) {
          for (let cx = 0; cx < cols; cx++) {
            const ch = rows[ry][cx];
            const color = def.colors[ch];
            if (!color) continue;
            ctx.fillStyle = color;
            ctx.fillRect(
              Math.round(x + cx * cellW),
              Math.round(y + ry * cellH),
              Math.ceil(cellW) + 1,
              Math.ceil(cellH) + 1
            );
          }
        }
      }
      ctx.restore();
    }

    /**
     * =========================================================================
     * Class: Player
     * =========================================================================
     * Encapsulates player state, WASD physics integration, boundaries,
     * invulnerability frames, and auto-combat weapon attributes.
     * =========================================================================
     */
