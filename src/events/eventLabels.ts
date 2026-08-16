import type { EventType, SkillLevel } from '../api/types';

export const TYPE_LABEL: Record<EventType, string> = {
  open_play: 'Open play',
  league: 'League',
  tournament: 'Tournament',
  training_camp: 'Training Camp',
  friendly: 'Friendly',
};

export const SKILL_LABEL: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all_levels: 'All levels',
};

export function formatEventPlace(barangay: string | null, city: string): string {
  return [barangay, city].filter(Boolean).join(', ');
}

export function formatEventWhen(startsAt: string): string {
  return new Date(startsAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
