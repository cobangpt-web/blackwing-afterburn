import test from "node:test";
import assert from "node:assert/strict";
import { createViewportLayout, getTouchLeadWorld } from "../public/viewport.js";

const WORLD = { worldWidth: 720, worldHeight: 1280 };

test("mobile portrait fills the screen vertically and crops only the side margins", () => {
  const layout = createViewportLayout({
    ...WORLD,
    screenWidth: 390,
    screenHeight: 844,
    coarsePointer: true,
  });

  assert.equal(layout.mode, "portrait-cover");
  assert.equal(layout.y, 0);
  assert.ok(layout.x < 0);
  assert.ok(layout.visibleWorld.width < WORLD.worldWidth);
  assert.ok(layout.visibleWorld.height >= WORLD.worldHeight - 1);
});

test("desktop viewport keeps the full game world visible", () => {
  const layout = createViewportLayout({
    ...WORLD,
    screenWidth: 1440,
    screenHeight: 900,
    coarsePointer: false,
  });

  assert.equal(layout.mode, "contain");
  assert.equal(layout.visibleWorld.left, 0);
  assert.equal(layout.visibleWorld.right, WORLD.worldWidth);
  assert.equal(layout.visibleWorld.height, WORLD.worldHeight);
});

test("touch lead keeps the aircraft above the player's finger in mobile cover mode", () => {
  assert.ok(getTouchLeadWorld("portrait-cover") > getTouchLeadWorld("contain"));
});
