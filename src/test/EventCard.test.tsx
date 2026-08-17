import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import EventCard from '../components/EventCard';
import type { EventItem, SkillLevel } from '../api/types';
import { SKILL_BADGE_CLASS, SKILL_BADGE_OVERLAY_CLASS } from '../events/eventLabels';

const base = (skill_level: SkillLevel): EventItem => ({
  id: 1,
  title: 'Sunday Open Play',
  description: 'x',
  event_type: 'open_play',
  skill_level,
  barangay: 'Malabanias',
  city: 'Angeles City',
  starts_at: '2026-08-20T18:00:00+08:00',
  photo_url: null,
  visibility: 'live',
  is_owner: false,
  my_application: null,
  created_by: { id: 2, name: 'Org' },
});

describe('EventCard skill badges', () => {
  test.each([
    ['beginner', 'Beginner'],
    ['intermediate', 'Intermediate'],
    ['advanced', 'Advanced'],
    ['all_levels', 'All levels'],
  ] as const)('applies %s colors to both skill badges', (level, label) => {
    render(
      <MemoryRouter>
        <EventCard event={base(level)} />
      </MemoryRouter>,
    );

    const badges = screen.getAllByText(label);
    expect(badges).toHaveLength(2);

    expect(badges.some((el) => el.className.includes(SKILL_BADGE_OVERLAY_CLASS[level]))).toBe(true);
    expect(badges.some((el) => el.className.includes(SKILL_BADGE_CLASS[level]))).toBe(true);
  });
});
