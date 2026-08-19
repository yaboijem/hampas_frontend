export type EventType =
  | 'open_play'
  | 'league'
  | 'tournament'
  | 'training_camp'
  | 'exclusive'
  | 'friendly' // legacy API value; display as Exclusive
  | 'try_out';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
export type Gender = 'male' | 'female' | 'other';
export type Role = 'player' | 'coach' | 'organizer';
export type ElevatedRole = 'coach' | 'organizer';
export type RoleRequestStatus = 'pending' | 'approved' | 'rejected';
export type Visibility = 'pending_review' | 'live' | 'rejected';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface AppNotification {
  id: number;
  message: string;
  type: string;
  read_at: string | null;
  created_at: string;
  data: {
    event_id?: number;
    application_id?: number;
    status?: 'approved' | 'rejected';
    organizer_name?: string;
    event_title?: string;
    applicant_name?: string;
  } | null;
}

export interface RoleRequest {
  id: number;
  role: ElevatedRole;
  status: RoleRequestStatus;
  note: string | null;
  created_at: string;
  reason?: string | null;
}

export interface AdminRoleRequest extends RoleRequest {
  user: { id: number; name: string; email: string };
}

export interface User {
  id: number;
  name: string;
  email: string;
  birth_date: string;
  gender: Gender;
  is_admin: boolean;
}

export interface AdminUserListItem {
  id: number;
  name: string;
  email: string;
  birth_date: string;
  gender: Gender;
  is_admin: boolean;
  roles: Role[];
  created_at: string;
}

export interface AdminUserProfiles {
  player: ProfileFieldset | null;
  coach: ProfileFieldset | null;
  organizer: ProfileFieldset | null;
}

export interface AdminUserDetail extends AdminUserListItem {
  profiles: AdminUserProfiles;
}

export type AdminUserWritePayload = {
  name: string;
  email: string;
  password?: string;
  birth_date: string;
  gender: Gender;
  is_admin: boolean;
  roles: Role[];
  profiles: {
    player?: ProfileFieldset | null;
    coach?: ProfileFieldset | null;
    organizer?: ProfileFieldset | null;
  };
};

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
  show_participants_publicly?: boolean;
  approved_participants?: { id: number; name: string }[];
  created_by: {
    id: number;
    name: string;
    /** Host capability roles (player/coach/organizer). */
    roles?: Role[];
    contact_number?: string | null;
    contact_email?: string | null;
    facebook_url?: string | null;
    instagram_url?: string | null;
    /** Present when host has coach role. */
    coach?: {
      achievements?: string[];
      experiences?: string[];
      bootcamp_names?: string[];
    } | null;
  };
}

export type PlayerPosition =
  | 'setter'
  | 'outside_hitter'
  | 'opposite_hitter'
  | 'middle_blocker'
  | 'libero';

export interface ProfileFieldset {
  /** @deprecated use positions */
  position?: string;
  positions?: PlayerPosition[];
  skill_level?: SkillLevel;
  /** coach list fields (API JSON arrays) */
  achievements?: string[] | string;
  experiences?: string[] | string;
  bootcamp_names?: string[] | string;
  /** @deprecated use bootcamp_names */
  bootcamp_name?: string;
  /** list of court names (API JSON array) */
  managed_courts?: string[] | string;
  contact_number?: string | null;
  contact_email?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
}

export const PLAYER_POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: 'setter', label: 'Setter' },
  { value: 'outside_hitter', label: 'Outside Hitter' },
  { value: 'opposite_hitter', label: 'Opposite Hitter' },
  { value: 'middle_blocker', label: 'Middle Blocker' },
  { value: 'libero', label: 'Libero' },
];

export interface Paginated<T> {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}
