import type { Role, User } from '../api/types';

/** Coaches, organizers, and admins may create events. */
export function canCreateEvent(
  user: Pick<User, 'is_admin'> | null | undefined,
  roles: readonly Role[] | null | undefined,
): boolean {
  if (!user) return false;
  if (user.is_admin) return true;
  if (!roles) return false;
  return roles.includes('coach') || roles.includes('organizer');
}
