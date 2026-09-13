/*
 * Keep the landscape mobile utility buttons side-by-side.
 * The fullscreen button sits immediately beside the switch-side button.
 */

const balttatoMobileButtonLayoutStyle = document.createElement("style");
balttatoMobileButtonLayoutStyle.textContent = `
  body.balttato-landscape-mobile:not(.balttato-controls-swapped) #mobile-fullscreen-button {
    left: calc(100% - 134px);
  }

  body.balttato-landscape-mobile:not(.balttato-controls-swapped) #mobile-swap-button {
    left: calc(100% - 74px);
  }

  body.balttato-landscape-mobile.balttato-controls-swapped #mobile-swap-button {
    left: 74px;
  }

  body.balttato-landscape-mobile.balttato-controls-swapped #mobile-fullscreen-button {
    left: 134px;
  }
`;
document.head.appendChild(balttatoMobileButtonLayoutStyle);

logDebug(1, "Landscape mobile utility buttons positioned side-by-side");
