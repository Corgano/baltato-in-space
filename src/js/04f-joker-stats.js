/*
 * P-1 progression layer: stat-driven upgrade presentation, pause-screen stat
 * inspection, Luck-scaled Joker offers, and Joker scrapping for reroll tokens.
 */

const balttatoJokerScrapStyle = document.createElement("style");
balttatoJokerScrapStyle.textContent = `
  .joker-scrap-btn {
    position: absolute;
    left: 3px;
    right: 3px;
    bottom: 2px;
    z-index: 60;
    padding: 2px 1px;
    border: 1px solid #60a5fa;
    border-radius: 3px;
    background: rgba(30, 64, 175, 0.94);
    color: #ffffff;
    font: 800 7px monospace;
    letter-spacing: 0.04em;
    cursor: pointer;
    opacity: 0;
    transform: translateY(3px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .joker-mini-card:hover .joker-scrap-btn {
    opacity: 1;
    transform: translateY(0);
  }
  .joker-scrap-btn:hover {
    background: #2563eb;
  }
`;
document.head.appendChild(balttatoJokerScrapStyle);

const BALTTATO_STAT_DEFINITIONS = [
  { key: "damage", label: "Damage", format: (v) => `${Math.round(v)}`, tooltip: "Base damage dealt by each projectile before critical hits and impact-speed bonuses." },
  { key: "fireInterval", label: "Fire Rate", format: (v) => `${v.toFixed(2)}s`, tooltip: "Time between automatic firing cycles. Lower is faster." },
  { key: "multishotCount", label: "Multishot", format: (v) => `${Math.round(v)}`, tooltip: "Projectiles fired in each automatic volley." },
  { key: "projectileSpeed", label: "Projectile Speed", format: (v) => `${Math.round(v)} px/s`, tooltip: "Flight speed of projectiles. Faster impacts receive a kinetic damage bonus." },
  { key: "weaponRange", label: "Range", format: (v) => `${Math.round(v)} px`, tooltip: "Maximum distance used when automatically acquiring targets." },
  { key: "pierceCount", label: "Penetration", format: (v) => `${Math.round(v)}`, tooltip: "Additional enemies a projectile can pass through before being destroyed." },
  { key: "fragmentation", label: "Fragmentation", format: (v) => `${Math.round(v)}`, tooltip: "Maximum fragmentation shards and the strength of penetration-fragment synergies." },
  { key: "chainHits", label: "Chain Lightning", format: (v) => `${Math.round(v)}`, tooltip: "Number of additional targets a projectile can chain to with lightning." },
  { key: "ricochetCount", label: "Ricochet", format: (v) => `${Math.round(v)}`, tooltip: "Number of times a projectile can bounce from the arena perimeter." },
  { key: "critChance", label: "Critical Chance", format: (v) => `${Math.round(v * 100)}%`, tooltip: "Chance for a projectile to deal its critical multiplier damage." },
  { key: "critMultiplier", label: "Critical Multiplier", format: (v) => `${v.toFixed(1)}x`, tooltip: "Damage multiplier applied when a critical hit occurs." },
  { key: "speed", label: "Movement", format: (v) => `${Math.round(v)} px/s`, tooltip: "Normal player movement speed. Boost temporarily doubles this value." },
  { key: "luck", label: "Luck", format: (v) => `${Math.round(v)}`, tooltip: "Improves rare-progression rolls, including Joker offers, reroll drops, chain effects, and bonus choices." },
  { key: "magnetRadius", label: "Pickup Radius", format: (v) => `${Math.round(v)} px`, tooltip: "Distance from which dropped XP is pulled toward the player." },
  { key: "maxHealth", label: "Max Hull", format: (v) => `${Math.round(v)}`, tooltip: "Maximum hull integrity. Hull upgrades also restore health when acquired." },
  { key: "armor", label: "Armor", format: (v) => `${Math.round(v)}`, tooltip: "Flat damage mitigation applied to incoming hits." },
  { key: "boostCapacity", label: "Boost Capacity", format: (v) => `${Math.round(v)}`, tooltip: "Maximum boost resource available while holding SHIFT during movement." },
  { key: "blastRadius", label: "Blast Radius", format: (v) => `${Math.round(v)} px`, tooltip: "Area reached by Plasma Warhead explosion waves." }
];

const BALTTATO_UPGRADE_STAT_EFFECTS = {
  chain_hits: ["Chain Lightning +1"],
  multishot: ["Multishot +1"],
  overclock_speed: ["Movement +25 px/s"],
  ricochet: ["Ricochet +1"],
  explosive_rounds: ["Plasma Warhead", "Blast Radius +15 px"],
  nanite_siphon: ["Life Leech +15%"],
  attack_speed: ["Fire Rate -18%"],
  heavy_ordnance: ["Damage +12"],
  piercing_rounds: ["Penetration +1"],
  vital_bulk: ["Max Hull +30", "Restore +40 Hull"],
  energy_shield: ["Armor +3"],
  vacuum_funnel: ["Pickup Radius +70 px"],
  crit_overcharge: ["Critical Chance +15%", "Critical Multiplier 2.5x"],
  targeting_sensor: ["Range +22% base scaling"],
  focal_array: ["Damage +6", "Range +30% base scaling"],
  accelerator_coils: ["Projectile Speed +20%"],
  hypervelocity_cores: ["Projectile Speed +35%", "Range +18% base scaling"],
  lucky_charm: ["Luck +1"],
  shrapnel_casing: ["Fragmentation +2"],
  cluster_munitions: ["Fragmentation +3", "Projectile Speed +15%"],
  boost_capacity: ["Boost Capacity +50", "Fully recharge Boost"]
};

function balttatoFormatUpgradeStats(upgrade) {
  const effects = BALTTATO_UPGRADE_STAT_EFFECTS[upgrade.id];
  return effects && effects.length > 0 ? `Stats: ${effects.join("\n")}` : "";
}

// Make every catalog entry expose explicit stat effects without rewriting the
// existing upgrade implementations. The actual behaviors already consume the
// player stat fields; this layer makes those relationships visible to the UI.
const balttatoOriginalUpgradeManagerClass = UpgradeManager;
UpgradeManager = class extends balttatoOriginalUpgradeManagerClass {
  constructor() {
    super();
    for (let i = 0; i < this.upgradeCatalog.length; i++) {
      const upgrade = this.upgradeCatalog[i];
      upgrade.statEffects = BALTTATO_UPGRADE_STAT_EFFECTS[upgrade.id] || [];
    }
    for (let i = 0; i < this.jokerCatalog.length; i++) {
      this.jokerCatalog[i].statEffects = ["Joker passive"];
    }
  }
};

const balttatoOriginalGenerateOfferingsStats = UpgradeManager.prototype.generateOfferings;
const BALTTATO_JOKER_BASE_CHANCE = 0.0075;
const BALTTATO_JOKER_LUCK_CAP = 0.075;

function balttatoJokerOfferChance(luck) {
  const normalizedLuck = Math.max(0, Number(luck) || 0);
  const luckFactor = 1 - Math.exp(-0.2 * normalizedLuck);
  return Math.min(BALTTATO_JOKER_LUCK_CAP, BALTTATO_JOKER_BASE_CHANCE + (BALTTATO_JOKER_LUCK_CAP - BALTTATO_JOKER_BASE_CHANCE) * luckFactor);
}

UpgradeManager.prototype.generateOfferings = function(forceJoker = false, player = null) {
  const choiceCount = 3 + (player && Math.random() < balttatoExtraChoiceChance(player) ? 1 : 0);
  const pool = [...this.upgradeCatalog];
  const offerings = [];

  while (pool.length > 0 && offerings.length < choiceCount) {
    const chosen = balttatoWeightedUpgradePick(pool);
    offerings.push(chosen);
    const chosenIndex = pool.indexOf(chosen);
    if (chosenIndex >= 0) pool.splice(chosenIndex, 1);
  }

  this.activeCards = offerings;

  const jokerChance = balttatoJokerOfferChance(player ? player.luck : 0);
  if (forceJoker || (Math.random() < jokerChance && this.jokerCatalog.length > 0)) {
    const chosenJoker = this.jokerCatalog[Math.floor(Math.random() * this.jokerCatalog.length)];
    const slot = Math.floor(Math.random() * this.activeCards.length);
    this.activeCards[slot] = { ...chosenJoker };
    logDebug(1, "Balatro Joker offering generated", {
      joker: chosenJoker.title,
      chance: jokerChance,
      luck: player ? player.luck : 0,
      slot
    });
  }

  this.hoveredCardIndex = -1;
  return this.activeCards;
};

GameManager.prototype.triggerLevelUp = function() {
  this.state = "LEVEL_UP";
  this.upgradeManager.generateOfferings(false, this.player);
  logDebug(1, "LEVEL UP TRIGGERED! Game paused for upgrade selection.", {
    level: this.playerLevel,
    currentXp: this.currentXp,
    threshold: this.xpThreshold,
    choices: this.upgradeManager.activeCards.length
  });
};

GameManager.prototype.rerollOfferings = function() {
  if (this.state !== "LEVEL_UP" || this.cardBurn.active || (this.rerollTokens || 0) <= 0) return false;
  this.rerollTokens -= 1;
  this.upgradeManager.generateOfferings(false, this.player);
  this.rerollButtonHover = false;
  logDebug(1, "Upgrade offerings rerolled", { rerollTokens: this.rerollTokens, choices: this.upgradeManager.activeCards.length });
  return true;
};

const balttatoOriginalUpgradeDrawOverlayStats = UpgradeManager.prototype.drawOverlay;
UpgradeManager.prototype.drawOverlay = function(ctx, canvasW, canvasH, playerLevel, burnInfo = null) {
  const descriptions = [];
  for (let i = 0; i < this.activeCards.length; i++) {
    const card = this.activeCards[i];
    descriptions.push(card.description);
    if (!card.isJoker) {
      const statText = balttatoFormatUpgradeStats(card);
      if (statText && !card.description.includes("Stats:")) card.description = `${card.description} — ${statText}`;
    }
  }

  try {
    balttatoOriginalUpgradeDrawOverlayStats.call(this, ctx, canvasW, canvasH, playerLevel, burnInfo);
  } finally {
    for (let i = 0; i < this.activeCards.length && i < descriptions.length; i++) {
      this.activeCards[i].description = descriptions[i];
    }
  }
};

function balttatoPlayerStatValue(player, definition) {
  const value = Number(player[definition.key]);
  return Number.isFinite(value) ? definition.format(value) : "—";
}

function balttatoDrawPauseStats(game) {
  const ctx = game.ctx;
  const centerX = game.width / 2;
  const centerY = game.height / 2;
  const panelX = centerX - 330;
  const panelY = centerY + 38;
  const panelW = 660;
  const rowH = 21;
  const colW = 220;

  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, panelX, panelY, panelW, 8 * rowH + 18, 7);
  ctx.fill();
  ctx.stroke();

  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  for (let i = 0; i < BALTTATO_STAT_DEFINITIONS.length; i++) {
    const definition = BALTTATO_STAT_DEFINITIONS[i];
    const col = Math.floor(i / 8);
    const row = i % 8;
    const x = panelX + 14 + col * colW;
    const y = panelY + 14 + row * rowH;
    const hovered = game.pauseStatHover === i;

    ctx.fillStyle = hovered ? "#38bdf8" : "#94a3b8";
    ctx.fillText(definition.label, x, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(balttatoPlayerStatValue(game.player, definition), x + colW - 14, y);
    ctx.textAlign = "left";

    if (hovered) {
      const tooltipW = 310;
      const tooltipH = 54;
      let tooltipX = game.mouseX + 14;
      let tooltipY = game.mouseY + 14;
      if (tooltipX + tooltipW > game.width) tooltipX = game.width - tooltipW - 8;
      if (tooltipY + tooltipH > game.height) tooltipY = game.height - tooltipH - 8;
      ctx.fillStyle = "rgba(2, 6, 23, 0.98)";
      ctx.strokeStyle = "#38bdf8";
      drawRoundedRect(ctx, tooltipX, tooltipY, tooltipW, tooltipH, 5);
      ctx.fill();
      ctx.stroke();
      ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(definition.label, tooltipX + 10, tooltipY + 14);
      ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(definition.tooltip, tooltipX + 10, tooltipY + 33);
    }
  }
  ctx.restore();
}

const balttatoOriginalRenderOverlaysStats = GameManager.prototype.renderOverlays;
GameManager.prototype.renderOverlays = function() {
  balttatoOriginalRenderOverlaysStats.call(this);
  if (this.state === "PAUSED") balttatoDrawPauseStats(this);
};

const balttatoOriginalBindEventsStats = GameManager.prototype.bindEvents;
GameManager.prototype.bindEvents = function() {
  balttatoOriginalBindEventsStats.call(this);
  this.pauseStatHover = -1;
  this.canvas.addEventListener("mousemove", (e) => {
    if (this.state !== "PAUSED") {
      this.pauseStatHover = -1;
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = (e.clientX - rect.left) * (this.width / rect.width);
    this.mouseY = (e.clientY - rect.top) * (this.height / rect.height);

    const panelX = this.width / 2 - 330;
    const panelY = this.height / 2 + 38;
    const rowH = 21;
    const colW = 220;
    this.pauseStatHover = -1;

    for (let i = 0; i < BALTTATO_STAT_DEFINITIONS.length; i++) {
      const col = Math.floor(i / 8);
      const row = i % 8;
      const x = panelX + 14 + col * colW;
      const y = panelY + 14 + row * rowH;
      if (this.mouseX >= x && this.mouseX <= x + colW && this.mouseY >= y - 10 && this.mouseY <= y + 10) {
        this.pauseStatHover = i;
        break;
      }
    }
    this.canvas.style.cursor = this.pauseStatHover >= 0 ? "help" : "default";
  });
};

function balttatoRefreshJokerRack(game) {
  const rack = document.getElementById("balatro-joker-rack");
  const counterLabel = document.getElementById("jokerCountLabel");
  if (!rack) return;

  const jokers = game.player.acquiredJokers || [];
  rack.classList.toggle("joker-rack-active", jokers.length > 0);
  if (counterLabel) counterLabel.textContent = `${jokers.length} / 5`;

  for (let s = 0; s < 5; s++) {
    const slotEl = document.getElementById(`jokerSlot${s}`);
    if (!slotEl) continue;
    const card = jokers[s];
    slotEl.classList.toggle("empty", !card);
    if (!card) {
      slotEl.innerHTML = "";
      continue;
    }

    slotEl.innerHTML = `
      <div class="joker-mini-card ${card.id === "joker_superposition" ? "superposition" : ""}" data-joker-id="${card.id}">
        <div class="joker-mini-corner top-left">J</div>
        <canvas class="joker-mini-thumb" width="38" height="38"></canvas>
        <div class="joker-mini-title">${card.title}</div>
        <button type="button" class="joker-scrap-btn" title="Scrap Joker for 1 reroll token">SCRAP +1</button>
        <div class="joker-mini-corner bottom-right">J</div>
      </div>
    `;

    const miniCanvas = slotEl.querySelector("canvas.joker-mini-thumb");
    if (miniCanvas) drawJokerPixelArt(miniCanvas.getContext("2d"), card.id, 0, 0, 38, 38);

    const cardEl = slotEl.querySelector(".joker-mini-card");
    if (cardEl) {
      cardEl.addEventListener("mouseenter", () => game.showJokerTooltip(card, cardEl));
      cardEl.addEventListener("mouseleave", () => game.hideJokerTooltip());
    }

    const scrapButton = slotEl.querySelector(".joker-scrap-btn");
    if (scrapButton) {
      scrapButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (game.state === "GAME_OVER") return;
        game.player.acquiredJokers.splice(s, 1);
        game.rerollTokens = (game.rerollTokens || 0) + 1;
        game.player.hasSnailMailJoker = game.player.acquiredJokers.some((joker) => joker.id === "joker_snail_mail");
        game.player.hasSuperpositionJoker = game.player.acquiredJokers.some((joker) => joker.id === "joker_superposition");
        game.floatingTexts.push(new FloatingText(game.player.x, game.player.y - 32, "+1 REROLL", "#60a5fa", 0.9));
        game.hideJokerTooltip();
        balttatoRefreshJokerRack(game);
        logDebug(1, "Joker scrapped for reroll token", { rerollTokens: game.rerollTokens });
      });
    }
  }
}

const balttatoOriginalOnJokerAcquiredStats = GameManager.prototype.onJokerAcquired;
GameManager.prototype.onJokerAcquired = function(card) {
  balttatoOriginalOnJokerAcquiredStats.call(this, card);
  balttatoRefreshJokerRack(this);
};

const balttatoOriginalRestartGameStats = GameManager.prototype.restartGame;
GameManager.prototype.restartGame = function() {
  balttatoOriginalRestartGameStats.call(this);
  this.pauseStatHover = -1;
  balttatoRefreshJokerRack(this);
};
