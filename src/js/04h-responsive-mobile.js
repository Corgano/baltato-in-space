/*
 * Responsive game frame and mobile movement controls.
 * The game keeps its 800x600 logical coordinate system; the complete UI frame
 * is scaled as one unit so its proportions are preserved on smaller screens.
 */

const BALTTATO_RESPONSIVE_BASE_WIDTH = 824;

function balttatoIsMobileDevice() {
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 800;
}

function balttatoScaleGameFrame() {
  const app = document.getElementById("app-container");
  if (!app) return;

  app.style.transform = "none";
  app.style.transformOrigin = "center center";

  const frameWidth = Math.max(app.scrollWidth, BALTTATO_RESPONSIVE_BASE_WIDTH);
  const frameHeight = app.scrollHeight;
  const availableWidth = Math.max(1, window.innerWidth - 16);
  const availableHeight = Math.max(1, window.innerHeight - 16);
  const scale = Math.min(availableWidth / frameWidth, availableHeight / frameHeight, 1);

  app.style.transform = `scale(${scale})`;
}

function balttatoInstallMobileControls() {
  const existing = document.getElementById("mobile-joystick");
  const mobile = balttatoIsMobileDevice();

  if (!mobile) {
    if (existing) existing.remove();
    document.body.classList.remove("balttato-mobile");
    balttatoScaleGameFrame();
    return;
  }

  document.body.classList.add("balttato-mobile");
  const diagnostics = document.getElementById("diagnostics-panel");
  if (diagnostics) diagnostics.style.display = "none";

  if (existing) {
    balttatoScaleGameFrame();
    return;
  }

  const joystick = document.createElement("div");
  joystick.id = "mobile-joystick";
  joystick.innerHTML = '<div class="mobile-joystick-knob"></div>';
  document.body.appendChild(joystick);

  const knob = joystick.querySelector(".mobile-joystick-knob");
  const maxDistance = 40;
  let activePointerId = null;
  let centerX = 0;
  let centerY = 0;

  const clearVirtualMovement = () => {
    const game = window.__arenaGameInstance;
    if (!game) return;
    game.activeKeys.delete("KeyW");
    game.activeKeys.delete("KeyA");
    game.activeKeys.delete("KeyS");
    game.activeKeys.delete("KeyD");
  };

  const updateVirtualMovement = (clientX, clientY) => {
    const game = window.__arenaGameInstance;
    if (!game) return;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }

    knob.style.transform = `translate(${dx}px, ${dy}px)`;

    const deadZone = 10;
    clearVirtualMovement();

    if (Math.abs(dx) > deadZone) game.activeKeys.add(dx < 0 ? "KeyA" : "KeyD");
    if (Math.abs(dy) > deadZone) game.activeKeys.add(dy < 0 ? "KeyW" : "KeyS");

    if (game.state === "READY" && distance > deadZone) {
      game.startGame();
    }
  };

  joystick.addEventListener("pointerdown", (e) => {
    if (activePointerId !== null) return;
    activePointerId = e.pointerId;
    joystick.setPointerCapture(e.pointerId);

    const rect = joystick.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
    updateVirtualMovement(e.clientX, e.clientY);
  });

  joystick.addEventListener("pointermove", (e) => {
    if (e.pointerId !== activePointerId) return;
    updateVirtualMovement(e.clientX, e.clientY);
  });

  const releaseJoystick = (e) => {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    knob.style.transform = "translate(0, 0)";
    clearVirtualMovement();
  };

  joystick.addEventListener("pointerup", releaseJoystick);
  joystick.addEventListener("pointercancel", releaseJoystick);
  joystick.addEventListener("lostpointercapture", () => {
    activePointerId = null;
    knob.style.transform = "translate(0, 0)";
    clearVirtualMovement();
  });

  logDebug(1, "Mobile controls enabled", {
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  });

  balttatoScaleGameFrame();
}

const balttatoResponsiveStyle = document.createElement("style");
balttatoResponsiveStyle.textContent = `
  #app-container {
    width: 824px;
    max-width: none;
    flex-shrink: 0;
    transform-origin: center center;
  }

  #canvas-container,
  #hud-panel,
  #diagnostics-panel,
  #balatro-joker-rack {
    max-width: none;
  }

  #canvas-container {
    width: 800px;
    height: 600px;
    max-height: none;
  }

  #mobile-joystick {
    display: none;
    position: fixed;
    left: 50%;
    bottom: 24px;
    width: 110px;
    height: 110px;
    transform: translateX(-50%);
    border: 2px solid rgba(148, 163, 184, 0.55);
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.62);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45), inset 0 0 20px rgba(56, 189, 248, 0.08);
    touch-action: none;
    z-index: 10000;
  }

  .mobile-joystick-knob {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 48px;
    height: 48px;
    transform: translate(0, 0);
    margin-left: -24px;
    margin-top: -24px;
    border: 2px solid rgba(56, 189, 248, 0.8);
    border-radius: 50%;
    background: rgba(56, 189, 248, 0.25);
    box-shadow: 0 0 14px rgba(56, 189, 248, 0.25);
    pointer-events: none;
  }

  body.balttato-mobile #mobile-joystick {
    display: block;
  }

  body.balttato-mobile #diagnostics-panel {
    display: none !important;
  }
`;
document.head.appendChild(balttatoResponsiveStyle);

balttatoInstallMobileControls();
window.addEventListener("resize", () => {
  balttatoInstallMobileControls();
  balttatoScaleGameFrame();
});
window.addEventListener("orientationchange", () => {
  setTimeout(balttatoInstallMobileControls, 100);
});

logDebug(1, "Responsive game frame enabled", {
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight,
  mobile: balttatoIsMobileDevice()
});
