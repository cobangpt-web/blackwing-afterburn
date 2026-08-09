import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_ITEM_LEVEL,
  PICKUPS,
  STAGES,
  applyItemLevel,
  createItemLevels,
  getBossTime,
  getItemStats,
  getRandomPickupId,
  getStage,
  getUpgradeChoices,
} from "../public/campaign.js";

test("campaign exposes five ordered stages", () => {
  assert.equal(STAGES.length, 5);
  assert.equal(getStage(-1).id, "tempest");
  assert.equal(getStage(99).id, "erebus");
  assert.ok(STAGES.every((stage, index) => index === 0 || stage.bossHp > STAGES[index - 1].bossHp));
});

test("quick mode moves every boss to eight seconds", () => {
  assert.equal(getBossTime(0, true), 8);
  assert.equal(getBossTime(4, true), 8);
  assert.equal(getBossTime(2, false), STAGES[2].bossAt);
});

test("upgrade choices are unique and exclude maxed items", () => {
  const levels = createItemLevels();
  levels.railgun = MAX_ITEM_LEVEL;
  const choices = getUpgradeChoices(3, levels, () => 0.25);
  assert.equal(choices.length, 3);
  assert.equal(new Set(choices).size, 3);
  assert.ok(!choices.includes("railgun"));
});

test("item levels clamp and produce stronger stats", () => {
  let levels = createItemLevels();
  for (let index = 0; index < 5; index += 1) levels = applyItemLevel(levels, "homing");
  assert.equal(levels.homing, MAX_ITEM_LEVEL);
  assert.ok(getItemStats(levels).missileDamage > getItemStats(createItemLevels()).missileDamage);
});

test("stage pickup pools use known item ids", () => {
  for (const stage of STAGES) {
    assert.ok(stage.pickupPool.length >= 3);
    assert.ok(stage.pickupPool.every((id) => PICKUPS[id]));
  }
});

test("random pickup selection follows the stage pool", () => {
  assert.equal(getRandomPickupId(0, () => 0), "shieldCell");
  assert.equal(getRandomPickupId(4, () => 0.99), "missileCache");
});
