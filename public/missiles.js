export const HOMING_MISSILE_SPEED = 520;
export const HOMING_MISSILE_TURN_RATE = 12.5;
export const HOMING_MISSILE_RESPONSE = 11;

function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function findMissileTarget(enemies, x, y) {
  let target = null;
  let bestDistance = Infinity;
  for (const enemy of enemies) {
    if (!enemy?.active || enemy.y < -100) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      target = enemy;
    }
  }
  return target;
}

export function steerMissile(missile, target, dt) {
  if (!missile || !target?.active) return false;
  const dx = target.x - missile.x;
  const dy = target.y - missile.y;
  if (dx * dx + dy * dy < 1) return false;

  const desired = Math.atan2(dy, dx);
  const delta = wrapAngle(desired - missile.angle);
  const maxTurn = HOMING_MISSILE_TURN_RATE * dt;
  missile.angle += Math.max(-maxTurn, Math.min(maxTurn, delta));

  const currentSpeed = Math.hypot(missile.vx, missile.vy);
  const speed = Math.max(HOMING_MISSILE_SPEED, currentSpeed);
  const response = Math.min(1, HOMING_MISSILE_RESPONSE * dt);
  missile.vx += (Math.cos(missile.angle) * speed - missile.vx) * response;
  missile.vy += (Math.sin(missile.angle) * speed - missile.vy) * response;
  return true;
}
