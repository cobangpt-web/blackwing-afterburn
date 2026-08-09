import test from "node:test";
import assert from "node:assert/strict";
import { applyBossDamage, getHitFlashDuration } from "../public/boss-feedback.js";

test("boss damage reports the visible hp change and clamps at zero", () => {
  assert.deepEqual(applyBossDamage(920, 920, 34), {
    before: 920,
    after: 886,
    damage: 34,
    defeated: false,
  });
  assert.deepEqual(applyBossDamage(12, 920, 50), {
    before: 12,
    after: 0,
    damage: 12,
    defeated: true,
  });
});

test("only a missile creates the strong boss flash", () => {
  assert.equal(getHitFlashDuration(3, "missile"), 1.8);
  assert.equal(getHitFlashDuration(3, "cannon"), 0);
  assert.equal(getHitFlashDuration(0, "cannon"), 1);
});
