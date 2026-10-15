import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStageLayout } from '../public/motion/stage-layout.js';

for (const [width, height] of [[390, 844], [393, 852], [844, 390], [370, 208], [1440, 900], [208, 370]]) {
 test(`scaled motion stays centered and visible at ${width} x ${height}`, () => {
  const { left, top, scale } = calculateStageLayout(width, height);
  const stageWidth = 1600 * scale, stageHeight = 900 * scale;
  assert.ok(left >= -1e-9 && top >= -1e-9);
  assert.ok(left + stageWidth <= width + 1e-9);
  assert.ok(top + stageHeight <= height + 1e-9);
  assert.ok(Math.abs(left + stageWidth / 2 - width / 2) < 1e-9);
  assert.ok(Math.abs(top + stageHeight / 2 - height / 2) < 1e-9);
 });
}

test('visual viewport offsets are applied once, after scaling', () => {
 const baseline = calculateStageLayout(390, 600);
 const offset = calculateStageLayout(390, 600, 12, 80);
 assert.equal(offset.scale, baseline.scale);
 assert.equal(offset.left, baseline.left + 12);
 assert.equal(offset.top, baseline.top + 80);
});

test('transient zero-sized or invalid viewports do not hide the stage', () => {
 for (const [width, height] of [[0, 844], [390, 0], [-1, 844], [NaN, 844], [390, Infinity]]) {
  assert.equal(calculateStageLayout(width, height), null);
 }
});
