import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  LOWER_FIELD_SHADE_STOPS,
  UPPER_FIELD_TINT_STOPS,
  drawLowerFieldShade,
  drawUpperFieldTint,
} from "../public/rendering.js";

test("lower field shade fades in without a hard boundary", () => {
  const calls = [];
  const gradient = {
    addColorStop(offset, color) {
      calls.push(["stop", offset, color]);
    },
  };
  const context = {
    globalAlpha: 0.2,
    fillStyle: null,
    createLinearGradient(...args) {
      calls.push(["gradient", ...args]);
      return gradient;
    },
    save() {
      calls.push(["save"]);
    },
    fillRect(...args) {
      calls.push(["fillRect", ...args]);
    },
    restore() {
      calls.push(["restore"]);
    },
  };

  drawLowerFieldShade(context, 720, 1280);

  assert.deepEqual(calls[0], ["gradient", 0, 0, 0, 1280]);
  assert.deepEqual(
    calls.filter(([type]) => type === "stop"),
    LOWER_FIELD_SHADE_STOPS.map(([offset, color]) => ["stop", offset, color]),
  );
  assert.match(LOWER_FIELD_SHADE_STOPS[0][1], /,\s*0\)$/);
  assert.ok(LOWER_FIELD_SHADE_STOPS.at(-1)[0] === 1);
  assert.deepEqual(calls.find(([type]) => type === "fillRect"), ["fillRect", 0, 0, 720, 1280]);
});

test("upper stage tint fades to transparent instead of ending at a fixed row", () => {
  const stops = [];
  const gradient = {
    addColorStop(offset, color) {
      stops.push([offset, color]);
    },
  };
  const context = {
    globalAlpha: 1,
    fillStyle: null,
    createLinearGradient() {
      return gradient;
    },
    save() {},
    fillRect() {},
    restore() {},
  };

  drawUpperFieldTint(context, 720, 1280, "#a8ddff", 0.07);

  assert.deepEqual(
    stops.map(([offset]) => offset),
    UPPER_FIELD_TINT_STOPS.map(([offset]) => offset),
  );
  assert.equal(stops[0][1], "rgba(168, 221, 255, 1)");
  assert.equal(stops.at(-1)[1], "rgba(168, 221, 255, 0)");
});

test("game background uses gradients instead of fixed-row color blocks", async () => {
  const gameSource = await readFile(new URL("../public/game.js", import.meta.url), "utf8");

  assert.match(gameSource, /drawUpperFieldTint\(ctx, WORLD_W, WORLD_H,/);
  assert.match(gameSource, /drawLowerFieldShade\(ctx, WORLD_W, WORLD_H\)/);
  assert.doesNotMatch(gameSource, /fillRect\(0, 0, WORLD_W, WORLD_H \* 0\.42\)/);
  assert.doesNotMatch(gameSource, /fillRect\(0, WORLD_H \* 0\.72,/);
});
