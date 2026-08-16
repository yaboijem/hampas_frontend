import { describe, expect, test } from 'vitest';
import {
  SKILL_LABEL,
  TYPE_LABEL,
  formatEventPlace,
  formatEventWhen,
} from '../events/eventLabels';

describe('eventLabels', () => {
  test('maps event types and skills', () => {
    expect(TYPE_LABEL.open_play).toBe('Open play');
    expect(TYPE_LABEL.training_camp).toBe('Training Camp');
    expect(SKILL_LABEL.all_levels).toBe('All levels');
  });

  test('formatEventPlace joins barangay and city', () => {
    expect(formatEventPlace('Malabanias', 'Angeles City')).toBe('Malabanias, Angeles City');
    expect(formatEventPlace(null, 'Angeles City')).toBe('Angeles City');
  });

  test('formatEventWhen produces a non-empty locale string', () => {
    const s = formatEventWhen('2026-08-20T18:00:00+08:00');
    expect(s.length).toBeGreaterThan(5);
  });
});
