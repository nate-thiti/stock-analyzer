import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeDistanceToTrigger, targetFromOffset } from './priceAlert.js';

describe('priceAlert', () => {
  it('above: needs rise from current', () => {
    const d = computeDistanceToTrigger(56.2, 91.82, 'above');
    assert.equal(d.move, 'up');
    assert.ok(Math.abs(d.pct - 63.38) < 0.1);
    assert.match(d.label, /อีก 63\.4% ถึงเป้า/);
  });

  it('below: needs drop from current', () => {
    const d = computeDistanceToTrigger(56.2, 52.26, 'below');
    assert.equal(d.move, 'down');
    assert.ok(Math.abs(d.pct - 7.01) < 0.1);
  });

  it('at target for above', () => {
    const d = computeDistanceToTrigger(100, 95, 'above');
    assert.equal(d.atTarget, true);
  });

  it('targetFromOffset applies percent', () => {
    assert.equal(targetFromOffset(100, 5), 105);
    assert.equal(targetFromOffset(100, -10), 90);
  });
});
