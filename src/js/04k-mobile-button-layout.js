/*
 * Keep the landscape mobile utility buttons side-by-side.
 * The fullscreen button sits immediately beside the switch-side button.
 */

const balttatoMobileButtonLayoutStyle = document.createElement("style");
balttatoMobileButtonLayoutStyle.textContent = `
  body.balttato-landscape-mobile:not(.balttato-controls-swapped) #mobile-fullscreen-button {
    left: calc(100% - 132px);
    top: 58px;
    bottom: auto;
  }

  body.balttato-landscape-mobile:not(.balttato-controls-swapped) #mobile-swap-button {
    left: calc(100% - 72px);
    top: 58px;
    bottom: auto;
  }

  body.balttato-landscape-mobile.balttato-controls-swapped #mobile-swap-button {
    left: 18px;
    top: 58px;
    bottom: auto;
  }

  body.balttato-landscape-mobile.balttato-controls-swapped #mobile-fullscreen-button {
    left: 78px;
    top: 58px;
    bottom: auto;
  }
`;
document.head.appendChild(balttatoMobileButtonLayoutStyle);

logDebug(1, "Landscape mobile utility buttons positioned beside movement control");
