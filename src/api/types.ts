export type EventType = 'open_play' | 'league' | 'tournament' | 'training_camp' | 'friendly';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
export type Gender = 'male' | 'female' | 'other';
export type Role = 'player' | 'coach' | 'organizer';
export type Visibility = 'pending_review' | 'live' | 'rejected';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: number;
  name: string;
  email: string;
  birth_date: string;
  gender: Gender;
  is_admin: boolean;
}

export interface EventItem {
  id: number;
  title: string;
  description: string;
  event_type: EventType;
  skill_level: SkillLevel;
  barangay: string | null;
  city: string;
  starts_at: string; // ISO 8601
  photo_url: string | null;
  visibility: Visibility;
  is_owner: boolean;
  distance_km?: number;
  my_application: { id: number; status: ApplicationStatus } | null;
  created_by: { id: number; name: string };
}

export interface ProfileFieldset {
  position?: string;
  skill_level?: SkillLevel;
  achievements?: string;
  bootcamp_name?: string;
  managed_courts?: string;
}

export interface Paginated<T> {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}
