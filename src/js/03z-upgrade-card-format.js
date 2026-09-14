/**
 * Formats explicit pipe-separated upgrade card stats as separate lines.
 * The main upgrade renderer uses Canvas fillText(), which does not natively
 * render newline characters, so this keeps the existing word-wrap logic and
 * adds newline support only while the upgrade overlay is being drawn.
 */
(() => {
  if (typeof UpgradeManager === "undefined" || typeof CanvasRenderingContext2D === "undefined") return;

  for (const card of UpgradeManager.prototype.upgradeCatalog || []) {
    if (typeof card.description === "string") {
      card.description = card.description.replace(/\s*\|\s*/g, "\n");
    }
  }

  const originalDrawOverlay = UpgradeManager.prototype.drawOverlay;
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;

  UpgradeManager.prototype.drawOverlay = function(...args) {
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
      if (typeof text === "string" && text.includes("\n")) {
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          originalFillText.call(this, lines[i].trim(), x, y + i * 15, maxWidth);
        }
        return;
      }

      return originalFillText.call(this, text, x, y, maxWidth);
    };

    try {
      return originalDrawOverlay.apply(this, args);
    } finally {
      CanvasRenderingContext2D.prototype.fillText = originalFillText;
    }
  };
})();
