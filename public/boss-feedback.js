export function clampBossHp(hp, maxHp) {
  const safeMax = Number.isFinite(maxHp) && maxHp > 0 ? maxHp : 0;
  const safeHp = Number.isFinite(hp) ? hp : 0;
  return Math.max(0, Math.min(safeMax, safeHp));
}

export function applyBossDamage(currentHp, maxHp, amount) {
  const before = clampBossHp(currentHp, maxHp);
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const after = clampBossHp(before - safeAmount, maxHp);
  return {
    before,
    after,
    damage: before - after,
    defeated: after <= 0,
  };
}

export function getBossHpRatio(hp, maxHp) {
  if (!Number.isFinite(maxHp) || maxHp <= 0) return 0;
  return clampBossHp(hp, maxHp) / maxHp;
}

export function shouldKeepBossHitFeedback(currentSource, remainingTime, nextSource) {
  return nextSource !== "missile"
    && currentSource === "missile"
    && Number.isFinite(remainingTime)
    && remainingTime > 0.18;
}
