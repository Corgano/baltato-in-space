function bootGame() {
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
