import test from "node:test";
import assert from "node:assert/strict";
import { computeFrameRange, computeWindow } from "./render-window.mjs";

test("converts a seconds range into an inclusive frame range", () => {
  assert.deepEqual(computeFrameRange({ startSec: 4, endSec: 7, fps: 30, durationSec: 30 }), { startFrame: 120, endFrame: 209, startSec: 4, endSec: 7 });
});

test("clamps a window and adds transition padding without escaping the document", () => {
  const result = computeWindow({ startSec: 0.2, endSec: 1.2, fps: 30, durationSec: 2, paddingSec: 0.5 });
  assert.equal(result.startSec, 0);
  assert.equal(result.endSec, 1.7);
  assert.equal(result.startFrame, 0);
  assert.equal(result.endFrame, 50);
});

test("rejects inverted and out-of-bounds ranges", () => {
  assert.throws(() => computeFrameRange({ startSec: 8, endSec: 4, fps: 30, durationSec: 30 }), /endSec/);
  assert.throws(() => computeFrameRange({ startSec: -1, endSec: 4, fps: 30, durationSec: 30 }), /startSec/);
});
