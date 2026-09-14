/*
 * Final card-stat formatting. Infinite scaling currently builds multi-effect
 * upgrade text with a pipe separator; the card renderer expects one stat per
 * line instead. Use the renderer's literal newline marker so 04m can split
 * the effects before drawing them.
 */

function balttatoFormatUpgradeStats(upgrade) {
  const config = BALTTATO_UPGRADE_SCALING[upgrade.id];
  if (!config) return upgrade.statEffects && upgrade.statEffects.length > 0 ? upgrade.statEffects.join("\\n") : "";
  return config.effects.map((effect) => {
    if (effect.key === "lifeLeechChance") return `${effect.stat} +${Math.round(effect.base * 100)}%`;
    if (effect.key === "lifeLeechAmount") return `${effect.stat} +${effect.amount}`;
    if (effect.mode === "multiplicative") return `${effect.stat} x${effect.multiplier.toFixed(2)}`;
    return `${effect.stat} +${effect.amount || effect.minimum || 0}`;
  }).join("\\n");
}

logDebug(1, "Multi-stat upgrade card separator fixed", { separator: "newline" });
