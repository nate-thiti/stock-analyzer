import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCalendarDateYmd,
  calendarDateInTimezone,
  formatHistoryDate,
  buildMarketTimeDisplay,
} from './dateFormat.js';

describe('formatCalendarDateYmd', () => {
  it('formats YYYY-MM-DD without shifting day in US timezone', () => {
    const label = formatCalendarDateYmd('2026-07-25');
    assert.match(label, /25/);
    assert.match(label, /ก\.ค\./);
  });
});

describe('calendarDateInTimezone', () => {
  it('maps UTC evening to same US trading day', () => {
    // 2026-07-25 20:00 UTC = 16:00 ET (same calendar day)
    const cal = calendarDateInTimezone('2026-07-25T20:00:00Z', 'America/New_York');
    assert.equal(cal, '2026-07-25');
  });

  it('maps late UTC to previous US trading day when before midnight ET', () => {
    // 2026-07-26 02:00 UTC = 2026-07-25 22:00 ET
    const cal = calendarDateInTimezone('2026-07-26T02:00:00Z', 'America/New_York');
    assert.equal(cal, '2026-07-25');
  });
});

describe('formatHistoryDate', () => {
  it('formats daily bar date without timezone shift', () => {
    const label = formatHistoryDate('2026-07-25', 'America/New_York');
    assert.match(label, /25/);
    assert.match(label, /ก\.ค\./);
  });
});

describe('buildMarketTimeDisplay', () => {
  it('exposes dateLabel aligned with exchange calendar', () => {
    const result = buildMarketTimeDisplay('2026-07-25T20:00:00Z', 'America/New_York');
    assert.ok(result.dateLabel);
    assert.match(result.dateLabel, /25/);
    assert.ok(result.timeOnly);
  });
});
