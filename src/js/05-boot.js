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

// Balatro-style Jokers use an exact 71x95 logical card design, rendered at 3x.
// The existing canvas renderer scales these dimensions directly, so the Joker
// card remains a crisp 213x285 canvas card while preserving the 71:95 source ratio.
const BALTTATO_JOKER_BASE_WIDTH = 71;
const BALTTATO_JOKER_BASE_HEIGHT = 95;
const BALTTATO_JOKER_RENDER_SCALE = 3;
const BALTTATO_JOKER_WIDTH = BALTTATO_JOKER_BASE_WIDTH * BALTTATO_JOKER_RENDER_SCALE;
const BALTTATO_JOKER_HEIGHT = BALTTATO_JOKER_BASE_HEIGHT * BALTTATO_JOKER_RENDER_SCALE;

// 04g-card-layout.js owns upgrade-card sizing and uses the active card count,
// including the Luck-based fourth choice. Do not override it here with a fixed
// three-card layout, or a fourth offering cannot be rendered correctly.

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
