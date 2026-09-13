/*
 * Mobile scaling correction.
 * Scale the complete game frame uniformly and position the scaled bounds
 * explicitly so narrow screens cannot clip the left edge.
 */

function balttatoScaleGameFrameCorrected() {
  const app = document.getElementById("app-container");
  if (!app) return;

  const landscape = balttatoIsLandscapeMobile();
  const swapped = document.body.classList.contains("balttato-controls-swapped");
  const viewport = window.visualViewport;
  const viewportWidth = viewport ? viewport.width : window.innerWidth;
  const viewportHeight = viewport ? viewport.height : window.innerHeight;

  app.style.transform = "none";
  app.style.transformOrigin = "top left";

  const frameWidth = Math.max(app.offsetWidth, BALTTATO_RESPONSIVE_BASE_WIDTH);
  const frameHeight = Math.max(app.offsetHeight, 1);
  const margin = 8;
  const controlWidth = landscape ? 140 : 0;
  const availableWidth = Math.max(1, viewportWidth - controlWidth - margin * 2);
  const availableHeight = Math.max(1, viewportHeight - margin * 2);
  const scale = Math.min(availableWidth / frameWidth, availableHeight / frameHeight, 1);
  const scaledWidth = frameWidth * scale;
  const scaledHeight = frameHeight * scale;

  let left;
  if (landscape) {
    const gameAreaLeft = swapped ? controlWidth + margin : margin;
    const gameAreaWidth = Math.max(1, viewportWidth - controlWidth - margin * 2);
    left = gameAreaLeft + Math.max(0, (gameAreaWidth - scaledWidth) / 2);
  } else {
    left = Math.max(margin, (viewportWidth - scaledWidth) / 2);
  }

  const top = Math.max(margin, (viewportHeight - scaledHeight) / 2);

  app.style.left = `${left}px`;
  app.style.top = `${top}px`;
  app.style.transform = `scale(${scale})`;
}

window.balttatoScaleGameFrame = balttatoScaleGameFrameCorrected;
balttatoScaleGameFrameCorrected();
window.addEventListener("resize", balttatoScaleGameFrameCorrected);
window.addEventListener("orientationchange", () => {
  setTimeout(balttatoScaleGameFrameCorrected, 100);
});
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", balttatoScaleGameFrameCorrected);
}

logDebug(1, "Corrected mobile game scaling enabled", {
  viewportWidth: window.visualViewport ? window.visualViewport.width : window.innerWidth,
  viewportHeight: window.visualViewport ? window.visualViewport.height : window.innerHeight,
  uniformScaling: true
});
