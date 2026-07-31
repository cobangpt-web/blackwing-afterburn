const DEFAULT_DEADZONE = 0.08;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function calculateJoystickVector({
  clientX,
  clientY,
  centerX,
  centerY,
  radius,
  deadzone = DEFAULT_DEADZONE,
}) {
  const safeRadius = Math.max(1, radius);
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const distance = Math.hypot(dx, dy);
  const unitX = distance > 0 ? dx / distance : 0;
  const unitY = distance > 0 ? dy / distance : 0;
  const limitedDistance = Math.min(distance, safeRadius);
  const magnitude = limitedDistance / safeRadius;
  const safeDeadzone = clamp(deadzone, 0, 0.95);
  const inputMagnitude = magnitude <= safeDeadzone
    ? 0
    : (magnitude - safeDeadzone) / (1 - safeDeadzone);

  return {
    inputX: unitX * inputMagnitude,
    inputY: unitY * inputMagnitude,
    knobX: unitX * limitedDistance,
    knobY: unitY * limitedDistance,
    magnitude,
  };
}
