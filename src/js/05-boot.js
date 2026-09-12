window.__arenaDebugEnabled = false;
DEBUG_LEVEL = 0;

function updateDebugControlsVisibility() {
      const controls = document.querySelector(".debug-controls");
      if (controls) {
        controls.style.display = window.__arenaDebugEnabled ? "flex" : "none";
      }
    }

window.enableDebug = function() {
      window.__arenaDebugEnabled = true;
      DEBUG_LEVEL = 1;
      updateDebugControlsVisibility();
      console.info("[ARENA DEBUG] Debug options enabled. Use the verbosity buttons to change logging level.");
};

window.disableDebug = function() {
      window.__arenaDebugEnabled = false;
      DEBUG_LEVEL = 0;
      updateDebugControlsVisibility();
      console.info("[ARENA DEBUG] Debug options disabled.");
};

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

// Override the fixed 800x600 presentation frame with the same 4:3 aspect ratio,
// while retaining responsive limits so the larger logical viewport remains usable
// on smaller displays. These elements intentionally share the same width.
const balttatoViewportStyle = document.createElement("style");
balttatoViewportStyle.textContent = `
  #hud-panel,
  #canvas-container,
  #diagnostics-panel,
  #balatro-joker-rack {
    width: ${BALTTATO_GAME_WIDTH}px;
    max-width: 95vw;
  }

  #canvas-container {
    height: ${BALTTATO_GAME_HEIGHT}px;
    max-height: min(72vh, calc(100vh - 220px));
    aspect-ratio: ${BALTTATO_GAME_WIDTH} / ${BALTTATO_GAME_HEIGHT};
  }
`;
document.head.appendChild(balttatoViewportStyle);

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

console.info("[ARENA] Debug options are hidden. Run enableDebug() in the console to reveal them.");

function bootGame() {
      updateDebugControlsVisibility();
      const canvasElement = document.getElementById("gameCanvas");
      if (canvasElement) {
        const game = new GameManager(canvasElement);
        game.init();
        window.__arenaGameInstance = game;
        logDebug(1, "Arena Survival Application v1.3.2 successfully bootstrapped.");
      } else {
        logDebug(0, "Failed to locate #gameCanvas element in DOM.");
      }
    }

    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", bootGame);
    } else {
      bootGame();
    }
