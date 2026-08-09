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

export function getHitFlashDuration(enemyType, source) {
  if (enemyType === 3) return source === "missile" ? 1.8 : 0;
  return 1;
}
