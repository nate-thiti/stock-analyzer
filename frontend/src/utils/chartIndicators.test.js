import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEMA,
  computeRSI,
  computeMACD,
  detectTrend,
} from './chartIndicators.js';

describe('chartIndicators', () => {
  const closes = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);

  it('computeEMA produces values after warmup', () => {
    const ema = computeEMA(closes, 9);
    assert.equal(ema[8] != null, true);
    assert.equal(ema[49] != null, true);
  });

  it('computeRSI stays in 0-100', () => {
    const rsi = computeRSI(closes, 14);
    const last = rsi.filter((v) => v != null).at(-1);
    assert.ok(last >= 0 && last <= 100);
  });

  it('computeMACD returns aligned arrays', () => {
    const { macd, signal, histogram } = computeMACD(closes);
    assert.equal(macd.length, closes.length);
    assert.equal(signal.length, closes.length);
    assert.equal(histogram.length, closes.length);
  });

  it('detectTrend identifies uptrend', () => {
    const ema21 = computeEMA(closes, 21);
    const ema50 = computeEMA(closes, 50);
    assert.equal(detectTrend(closes, ema21, ema50), 'uptrend');
  });
});
