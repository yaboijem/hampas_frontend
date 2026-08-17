import type { EventType, SkillLevel } from '../api/types';

export const TYPE_LABEL: Record<EventType, string> = {
  open_play: 'Open play',
  league: 'League',
  tournament: 'Tournament',
  training_camp: 'Training Camp',
  exclusive: 'Exclusive',
  friendly: 'Exclusive', // legacy API value
  try_out: 'Try Out',
};

export const TYPE_EMOJI: Record<EventType, string> = {
  open_play: '🏐',
  league: '🏅',
  tournament: '🏆',
  training_camp: '💪',
  exclusive: '🤝',
  friendly: '🤝',
  try_out: '🎯',
};

export function typeLabel(type: string): string {
  return (TYPE_LABEL as Record<string, string>)[type] ?? type;
}

export function typeEmoji(type: string): string {
  return (TYPE_EMOJI as Record<string, string>)[type] ?? '🏐';
}
export const SKILL_LABEL: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all_levels: 'All levels',
};

/** Body chip: solid ski-trail skill colors */
export const SKILL_BADGE_CLASS: Record<SkillLevel, string> = {
  beginner: 'bg-emerald-100 text-emerald-800',
  intermediate: 'bg-blue-100 text-blue-800',
  advanced: 'border border-red-500/70 bg-slate-900 text-white',
  all_levels: 'bg-emerald-100 text-emerald-800',
};

/** Photo overlay: same hues, frosted for photo readability */
export const SKILL_BADGE_OVERLAY_CLASS: Record<SkillLevel, string> = {
  beginner: 'border border-emerald-200/60 bg-emerald-100/80 text-emerald-900 backdrop-blur-md',
  intermediate: 'border border-blue-200/60 bg-blue-100/80 text-blue-900 backdrop-blur-md',
  advanced: 'border border-red-500/70 bg-slate-900/85 text-white backdrop-blur-md',
  all_levels: 'border border-emerald-200/60 bg-emerald-100/80 text-emerald-900 backdrop-blur-md',
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
