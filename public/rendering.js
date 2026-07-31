export const LOWER_FIELD_SHADE_STOPS = Object.freeze([
  Object.freeze([0.54, "rgba(2, 9, 22, 0)"]),
  Object.freeze([0.72, "rgba(2, 9, 22, 0.06)"]),
  Object.freeze([1, "rgba(2, 9, 22, 0.34)"]),
]);

export const UPPER_FIELD_TINT_STOPS = Object.freeze([
  Object.freeze([0, 1]),
  Object.freeze([0.24, 0.82]),
  Object.freeze([0.54, 0]),
]);

function accentWithAlpha(accent, alpha) {
  const hex = accent.replace("#", "");
  const normalized = hex.length === 3
    ? [...hex].map((character) => character + character).join("")
    : hex;
  const value = Number.parseInt(normalized, 16);
  const red = value >> 16 & 255;
  const green = value >> 8 & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function drawUpperFieldTint(context, width, height, accent, alpha) {
  const tint = context.createLinearGradient(0, 0, 0, height);
  for (const [offset, stopAlpha] of UPPER_FIELD_TINT_STOPS) {
    tint.addColorStop(offset, accentWithAlpha(accent, stopAlpha));
  }
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = tint;
  context.fillRect(0, 0, width, height);
  context.restore();
}

export function drawLowerFieldShade(context, width, height) {
  const shade = context.createLinearGradient(0, 0, 0, height);
  for (const [offset, color] of LOWER_FIELD_SHADE_STOPS) {
    shade.addColorStop(offset, color);
  }
  context.save();
  context.globalAlpha = 1;
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
  context.restore();
}
