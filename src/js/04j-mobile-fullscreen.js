/*
 * Mobile landscape controls and browser fullscreen support.
 * Fullscreen is user-initiated because mobile browsers generally require a
 * user gesture before allowing requestFullscreen().
 */

function balttatoIsFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

async function balttatoRequestFullscreen() {
  try {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      await element.requestFullscreen({ navigationUI: "hide" });
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    }
  } catch (error) {
    logDebug(1, "Fullscreen request was rejected by the browser", {
      error: String(error)
    });
  }
}

async function balttatoExitFullscreen() {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  } catch (error) {
    logDebug(1, "Fullscreen exit was rejected by the browser", {
      error: String(error)
    });
  }
}

function balttatoUpdateMobileFullscreenButton() {
  const button = document.getElementById("mobile-fullscreen-button");
  if (!button) return;

  const fullscreen = balttatoIsFullscreen();
  button.textContent = fullscreen ? "⤢" : "⛶";
  button.setAttribute("aria-label", fullscreen ? "Exit fullscreen" : "Enter fullscreen");
  button.title = fullscreen ? "Exit fullscreen" : "Fullscreen";
}

function balttatoInstallMobileFullscreen() {
  const mobile = balttatoIsMobileDevice();
  const landscape = balttatoIsLandscapeMobile();
  let button = document.getElementById("mobile-fullscreen-button");

  if (!mobile || !landscape) {
    if (button) button.remove();
    return;
  }

  if (!button) {
    button = document.createElement("button");
    button.id = "mobile-fullscreen-button";
    button.type = "button";
    button.addEventListener("click", async () => {
      if (balttatoIsFullscreen()) {
        await balttatoExitFullscreen();
      } else {
        await balttatoRequestFullscreen();
      }
      balttatoUpdateMobileFullscreenButton();
      setTimeout(balttatoScaleGameFrame, 100);
    });
    document.body.appendChild(button);
  }

  const swapped = document.body.classList.contains("balttato-controls-swapped");
  button.classList.toggle("balttato-fullscreen-swapped", swapped);
  balttatoUpdateMobileFullscreenButton();
}

const balttatoMobileFullscreenStyle = document.createElement("style");
balttatoMobileFullscreenStyle.textContent = `
  #mobile-fullscreen-button {
    display: none;
    position: fixed;
    bottom: 24px;
    width: 54px;
    height: 42px;
    border: 1px solid rgba(148, 163, 184, 0.65);
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.78);
    color: rgba(226, 232, 240, 0.95);
    font-size: 24px;
    line-height: 1;
    touch-action: manipulation;
    z-index: 10001;
  }

  body.balttato-landscape-mobile #mobile-fullscreen-button {
    display: block;
    left: calc(100% - 74px);
  }

  body.balttato-landscape-mobile.balttato-controls-swapped #mobile-fullscreen-button {
    left: 74px;
  }

  body.balttato-mobile:not(.balttato-landscape-mobile) #mobile-fullscreen-button {
    display: none !important;
  }
`;
document.head.appendChild(balttatoMobileFullscreenStyle);

balttatoInstallMobileFullscreen();
window.addEventListener("resize", balttatoInstallMobileFullscreen);
window.addEventListener("orientationchange", () => {
  setTimeout(balttatoInstallMobileFullscreen, 100);
});
document.addEventListener("fullscreenchange", balttatoUpdateMobileFullscreenButton);
document.addEventListener("webkitfullscreenchange", balttatoUpdateMobileFullscreenButton);

logDebug(1, "Mobile landscape fullscreen control enabled", {
  fullscreenApi: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen),
  navigationUIHideRequested: true
});
