const MOBILE_PORTRAIT_MAX_WIDTH = 620;
const MOBILE_PORTRAIT_RATIO = 1.12;
const MOBILE_TOUCH_LEAD_WORLD = 118;
const DEFAULT_TOUCH_LEAD_WORLD = 76;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createViewportLayout({
  screenWidth,
  screenHeight,
  worldWidth,
  worldHeight,
  coarsePointer = false,
}) {
  const safeScreenWidth = Math.max(1, screenWidth);
  const safeScreenHeight = Math.max(1, screenHeight);
  const widthScale = safeScreenWidth / worldWidth;
  const heightScale = safeScreenHeight / worldHeight;
  const portrait = safeScreenHeight >= safeScreenWidth * MOBILE_PORTRAIT_RATIO;
  const mobilePortrait = coarsePointer && portrait && safeScreenWidth <= MOBILE_PORTRAIT_MAX_WIDTH;
  const scale = mobilePortrait ? Math.max(widthScale, heightScale) : Math.min(widthScale, heightScale);
  const x = (safeScreenWidth - worldWidth * scale) * 0.5;
  const y = mobilePortrait ? 0 : (safeScreenHeight - worldHeight * scale) * 0.5;
  const visibleLeft = clamp(-x / scale, 0, worldWidth);
  const visibleTop = clamp(-y / scale, 0, worldHeight);
  const visibleRight = clamp((safeScreenWidth - x) / scale, 0, worldWidth);
  const visibleBottom = clamp((safeScreenHeight - y) / scale, 0, worldHeight);

  return {
    mode: mobilePortrait ? "portrait-cover" : "contain",
    scale,
    x,
    y,
    visibleWorld: Object.freeze({
      left: visibleLeft,
      top: visibleTop,
      right: visibleRight,
      bottom: visibleBottom,
      width: Math.max(1, visibleRight - visibleLeft),
      height: Math.max(1, visibleBottom - visibleTop),
    }),
  };
}

export function getTouchLeadWorld(layoutMode) {
  return layoutMode === "portrait-cover" ? MOBILE_TOUCH_LEAD_WORLD : DEFAULT_TOUCH_LEAD_WORLD;
}
