import { describe, expect, test } from 'vitest';
import type { SkillLevel } from '../api/types';
import {
  SKILL_BADGE_CLASS,
  SKILL_BADGE_OVERLAY_CLASS,
  SKILL_LABEL,
  TYPE_EMOJI,
  TYPE_LABEL,
  formatEventPlace,
  formatEventWhen,
  hostDisplayName,
  hostRoleLabel,
} from '../events/eventLabels';

describe('eventLabels', () => {
  test('maps event types and skills', () => {
    expect(TYPE_LABEL.open_play).toBe('Open play');
    expect(TYPE_LABEL.training_camp).toBe('Training Camp');
    expect(TYPE_LABEL.exclusive).toBe('Exclusive');
    expect(TYPE_LABEL.try_out).toBe('Try Out');
    expect(TYPE_EMOJI.open_play).toBe('');
    expect(TYPE_EMOJI.league).toBe('🏅');
    expect(TYPE_EMOJI.tournament).toBe('🏆');
    expect(TYPE_EMOJI.training_camp).toBe('💪');
    expect(TYPE_EMOJI.exclusive).toBe('🤝');
    expect(TYPE_EMOJI.try_out).toBe('🎯');
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
    expect(SKILL_BADGE_CLASS.all_levels).toMatch(/emerald/);

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

  test('host title for coach vs organizer', () => {
    expect(hostRoleLabel(['coach'])).toBe('Organizer');
    expect(hostRoleLabel(['organizer'])).toBe('Organizer');
    expect(hostDisplayName('Alex', ['coach'])).toBe('Coach Alex');
    expect(hostDisplayName('Alex', ['organizer'])).toBe('Alex');
    expect(hostDisplayName('Alex', ['coach', 'organizer'])).toBe('Coach Alex');
  });
});
