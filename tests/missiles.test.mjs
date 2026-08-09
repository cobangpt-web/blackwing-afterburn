import test from "node:test";
import assert from "node:assert/strict";
import {
  HOMING_MISSILE_SPEED,
  findMissileTarget,
  steerMissile,
} from "../public/missiles.js";

test("homing missile bends toward a target instead of flying straight", () => {
  const missile = { x: 100, y: 300, vx: 0, vy: -HOMING_MISSILE_SPEED, angle: -Math.PI / 2 };
  const target = { active: true, x: 330, y: 100 };

  for (let frame = 0; frame < 18; frame += 1) {
    steerMissile(missile, target, 1 / 60);
    missile.x += missile.vx / 60;
    missile.y += missile.vy / 60;
  }

  assert.ok(missile.x > 100, "missile should turn toward the target's horizontal position");
  assert.ok(missile.angle > -Math.PI / 2, "missile heading should rotate toward the target");
});

test("missile targeting reacquires the nearest active enemy", () => {
  const enemies = [
    { active: false, x: 120, y: 80 },
    { active: true, x: 420, y: 120 },
    { active: true, x: 160, y: 240 },
  ];

  assert.equal(findMissileTarget(enemies, 160, 260), enemies[2]);
  assert.equal(findMissileTarget([{ active: false, x: 160, y: 240 }], 160, 260), null);
});
