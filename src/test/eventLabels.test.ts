import { describe, expect, test } from 'vitest';
import type { SkillLevel } from '../api/types';
import {
  SKILL_BADGE_CLASS,
  SKILL_BADGE_OVERLAY_CLASS,
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

  test('SKILL_BADGE_CLASS covers every skill with distinctive colors', () => {
    const levels: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'all_levels'];
    for (const level of levels) {
      expect(SKILL_BADGE_CLASS[level]).toBeTruthy();
      expect(SKILL_BADGE_OVERLAY_CLASS[level]).toBeTruthy();
    }

    expect(SKILL_BADGE_CLASS.beginner).toMatch(/emerald/);
    expect(SKILL_BADGE_CLASS.intermediate).toMatch(/blue/);
    expect(SKILL_BADGE_CLASS.advanced).toMatch(/slate-900|zinc-900|neutral-900/);
    expect(SKILL_BADGE_CLASS.advanced).toMatch(/red/);
    expect(SKILL_BADGE_CLASS.all_levels).toMatch(/ice|muted|slate/);

    expect(SKILL_BADGE_OVERLAY_CLASS.beginner).toMatch(/emerald/);
    expect(SKILL_BADGE_OVERLAY_CLASS.beginner).toMatch(/backdrop-blur/);
    expect(SKILL_BADGE_OVERLAY_CLASS.advanced).toMatch(/red/);
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
