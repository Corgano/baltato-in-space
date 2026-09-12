/*
 * Compact level-up card presentation. The existing card renderer is kept intact;
 * this layer renders it into a proportional virtual canvas so the complete card
 * design, including Joker artwork, shrinks together without internal overlap.
 */

const BALTTATO_CARD_VIRTUAL_WIDTH = 933.3333333333;
const BALTTATO_CARD_VIRTUAL_HEIGHT = 700;
const BALTTATO_CARD_BASE_WIDTH = 210;
const BALTTATO_CARD_BASE_HEIGHT = 245;
const BALTTATO_CARD_BASE_GAP = 20;

UpgradeManager.prototype.getCardLayout = function(canvasW, canvasH) {
  const cardCount = Math.max(1, this.activeCards.length);
  const totalW = BALTTATO_CARD_BASE_WIDTH * cardCount + BALTTATO_CARD_BASE_GAP * (cardCount - 1);
  const startX = (canvasW - totalW) / 2;
  const startY = canvasH / 2 - 85;
  const rects = [];

  for (let i = 0; i < cardCount; i++) {
    rects.push({
      x: startX + i * (BALTTATO_CARD_BASE_WIDTH + BALTTATO_CARD_BASE_GAP),
      y: startY,
      w: BALTTATO_CARD_BASE_WIDTH,
      h: BALTTATO_CARD_BASE_HEIGHT
    });
  }

  return rects;
};

const balttatoOriginalCompactDrawOverlay = UpgradeManager.prototype.drawOverlay;
UpgradeManager.prototype.drawOverlay = function(ctx, canvasW, canvasH, playerLevel, burnInfo = null) {
  const scaleX = canvasW / BALTTATO_CARD_VIRTUAL_WIDTH;
  const scaleY = canvasH / BALTTATO_CARD_VIRTUAL_HEIGHT;

  ctx.save();
  ctx.scale(scaleX, scaleY);
  balttatoOriginalCompactDrawOverlay.call(
    this,
    ctx,
    BALTTATO_CARD_VIRTUAL_WIDTH,
    BALTTATO_CARD_VIRTUAL_HEIGHT,
    playerLevel,
    burnInfo
  );
  ctx.restore();
};

logDebug(1, "Compact upgrade card layout enabled", {
  cardWidth: BALTTATO_CARD_BASE_WIDTH,
  cardHeight: BALTTATO_CARD_BASE_HEIGHT,
  renderedWidth: BALTTATO_CARD_BASE_WIDTH * 800 / BALTTATO_CARD_VIRTUAL_WIDTH,
  renderedHeight: BALTTATO_CARD_BASE_HEIGHT * 600 / BALTTATO_CARD_VIRTUAL_HEIGHT,
  supportsFourCards: true
});
