/*
 * Keep the landscape mobile utility buttons together at the bottom of the
 * current control side, below the movement control.
 */

function balttatoInstallMobileButtonGroup() {
  const swapButton = document.getElementById("mobile-swap-button");
  const fullscreenButton = document.getElementById("mobile-fullscreen-button");
  if (!swapButton || !fullscreenButton) return;

  let group = document.getElementById("mobile-utility-button-group");
  if (!group) {
    group = document.createElement("div");
    group.id = "mobile-utility-button-group";
    document.body.appendChild(group);
  }

  if (swapButton.parentElement !== group) group.appendChild(swapButton);
  if (fullscreenButton.parentElement !== group) group.appendChild(fullscreenButton);
}

const balttatoMobileButtonLayoutStyle = document.createElement("style");
balttatoMobileButtonLayoutStyle.textContent = `
  #mobile-utility-button-group {
    display: none;
    position: fixed;
    bottom: 24px;
    gap: 6px;
    z-index: 10001;
  }

  body.balttato-landscape-mobile #mobile-utility-button-group {
    display: flex;
    right: 20px;
  }

  body.balttato-landscape-mobile.balttato-controls-swapped #mobile-utility-button-group {
    display: flex;
    right: auto;
    left: 20px;
  }

  body.balttato-landscape-mobile #mobile-utility-button-group button {
    position: static;
    left: auto;
    top: auto;
    bottom: auto;
    transform: none;
    flex: 0 0 54px;
  }

  body:not(.balttato-landscape-mobile) #mobile-utility-button-group {
    display: none !important;
  }
`;
document.head.appendChild(balttatoMobileButtonLayoutStyle);

balttatoInstallMobileButtonGroup();
window.addEventListener("resize", balttatoInstallMobileButtonGroup);
window.addEventListener("orientationchange", () => {
  setTimeout(balttatoInstallMobileButtonGroup, 100);
});

logDebug(1, "Landscape mobile utility button group positioned below movement control");
