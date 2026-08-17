import { describe, expect, test } from 'vitest';
import {
  buildIncreaseMessages,
  emptyCounts,
} from '../lib/adminNotifications';

describe('buildIncreaseMessages', () => {
  test('returns null when nothing increased', () => {
    const c = { coach: 1, organizer: 0, events: 2, total: 3 };
    expect(buildIncreaseMessages(c, c)).toBeNull();
    expect(
      buildIncreaseMessages(c, { ...c, coach: 0, total: 2 }),
    ).toBeNull();
  });

  test('describes single and multiple increases', () => {
    const prev = emptyCounts();
    expect(
      buildIncreaseMessages(prev, {
        coach: 2,
        organizer: 0,
        events: 0,
        total: 2,
      }),
    ).toBe('2 new coach requests');
    expect(
      buildIncreaseMessages(prev, {
        coach: 1,
        organizer: 0,
        events: 1,
        total: 2,
      }),
    ).toBe('1 new coach request, 1 new event request');
  });
});
