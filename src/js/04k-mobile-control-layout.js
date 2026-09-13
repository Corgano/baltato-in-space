/*
 * Keep the mobile side controls limited to landscape mode and stack the
 * fullscreen and side-switch buttons without overlap.
 */

function balttatoRefreshMobileControlLayout() {
  const mobile = balttatoIsMobileDevice();
  const landscape = balttatoIsLandscapeMobile();
  const swapButton = document.getElementById("mobile-swap-button");
  const fullscreenButton = document.getElementById("mobile-fullscreen-button");

  if (!mobile || !landscape) {
    if (swapButton) swapButton.style.display = "none";
    if (fullscreenButton) fullscreenButton.style.display = "none";
    return;
  }

  if (swapButton) swapButton.style.display = "block";
  if (fullscreenButton) fullscreenButton.style.display = "block";
}

const balttatoMobileControlLayoutStyle = document.createElement("style");
balttatoMobileControlLayoutStyle.textContent = `
  body.balttato-mobile:not(.balttato-landscape-mobile) #mobile-swap-button,
  body.balttato-mobile:not(.balttato-landscape-mobile) #mobile-fullscreen-button {
    display: none !important;
  }

  body.balttato-landscape-mobile #mobile-swap-button {
    bottom: 76px;
  }
`;
document.head.appendChild(balttatoMobileControlLayoutStyle);

balttatoRefreshMobileControlLayout();
window.addEventListener("resize", balttatoRefreshMobileControlLayout);
window.addEventListener("orientationchange", () => {
  setTimeout(balttatoRefreshMobileControlLayout, 100);
});
