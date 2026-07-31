import test from "node:test";
import assert from "node:assert/strict";
import { calculateJoystickVector } from "../public/joystick.js";

test("joystick stays idle inside its center deadzone", () => {
  const vector = calculateJoystickVector({
    clientX: 101,
    clientY: 101,
    centerX: 100,
    centerY: 100,
    radius: 40,
  });

  assert.equal(vector.inputX, 0);
  assert.equal(vector.inputY, 0);
});

test("joystick produces normalized directional input", () => {
  const vector = calculateJoystickVector({
    clientX: 140,
    clientY: 100,
    centerX: 100,
    centerY: 100,
    radius: 40,
  });

  assert.equal(vector.inputX, 1);
  assert.equal(vector.inputY, 0);
  assert.equal(vector.knobX, 40);
  assert.equal(vector.knobY, 0);
});

test("joystick knob remains clamped inside the circular pad", () => {
  const vector = calculateJoystickVector({
    clientX: 190,
    clientY: 190,
    centerX: 100,
    centerY: 100,
    radius: 40,
  });

  assert.ok(Math.hypot(vector.knobX, vector.knobY) <= 40.0001);
  assert.ok(Math.hypot(vector.inputX, vector.inputY) <= 1.0001);
});
