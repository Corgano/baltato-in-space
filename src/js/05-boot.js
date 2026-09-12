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
