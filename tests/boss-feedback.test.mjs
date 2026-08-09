import test from "node:test";
import assert from "node:assert/strict";
import {
  applyBossDamage,
  getBossHpRatio,
  shouldKeepBossHitFeedback,
} from "../public/boss-feedback.js";

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

test("boss hp ratio stays within the health bar bounds", () => {
  assert.equal(getBossHpRatio(920, 920), 1);
  assert.equal(getBossHpRatio(460, 920), 0.5);
  assert.equal(getBossHpRatio(-10, 920), 0);
  assert.equal(getBossHpRatio(1000, 920), 1);
});

test("missile feedback is not overwritten by a weaker cannon hit immediately after", () => {
  assert.equal(shouldKeepBossHitFeedback("missile", 0.6, "cannon"), true);
  assert.equal(shouldKeepBossHitFeedback("missile", 0.1, "cannon"), false);
  assert.equal(shouldKeepBossHitFeedback("cannon", 0.6, "cannon"), false);
  assert.equal(shouldKeepBossHitFeedback("cannon", 0.6, "missile"), false);
});
