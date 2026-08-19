import type { ElevatedRole } from '../api/types';

export type RoleRequestCopy = {
  title: string;
  privilegesHeading: string;
  rulesHeading: string;
  privileges: string[];
  rules: string[];
  acceptLabel: string;
  noteLabel: string;
  notePlaceholder: string;
  submitLabel: string;
};

const SHARED_ACCEPT =
  'I have read and accept the privileges and rules for this role.';

export const ROLE_REQUEST_COPY: Record<ElevatedRole, RoleRequestCopy> = {
  coach: {
    title: 'Request coach access',
    privilegesHeading: 'Privileges',
    rulesHeading: 'Rules',
    privileges: [
      'Create and manage your own events (subject to admin go-live review when required).',
      'Host training-style and open sessions under your name (shown as Coach {name} to players).',
      'Edit your coach profile (achievements, bootcamp name) so players know your background.',
      'Receive applications and manage attendance for events you host.',
      'Represent yourself as a coach in the Hampas community in Pampanga.',
    ],
    rules: [
      'Host safely and respectfully; you are responsible for how your sessions are run on the ground.',
      'Be honest in your request note and profile; do not misrepresent experience or credentials.',
      'Do not spam, harass, or discriminate against players or other hosts.',
      'Keep event details accurate (time, place, skill level, fees if any).',
      'Follow Hampas Terms and Privacy Policy; admins may revoke coach access for abuse.',
      'Cancel or update events promptly if plans change so players are not stranded.',
    ],
    acceptLabel: SHARED_ACCEPT,
    noteLabel: 'Note to admin (optional)',
    notePlaceholder: 'Why you want this role, courts you run, experience, etc.',
    submitLabel: 'Submit request',
  },
  organizer: {
    title: 'Request organizer access',
    privilegesHeading: 'Privileges',
    rulesHeading: 'Rules',
    privileges: [
      'Create and manage events for courts, leagues, and community play (subject to admin go-live review when required).',
      'Maintain organizer contact details (phone, email, socials) shown on your events.',
      'Manage managed courts and public-facing host information on your profile.',
      'Review and act on player applications for events you host.',
      'Build a visible presence as an event organizer on Hampas.',
    ],
    rules: [
      'You are accountable for the events you publish: accurate venue, schedule, and requirements.',
      'Communicate clearly with applicants (approve/reject in a reasonable time).',
      'Do not collect or misuse player personal data beyond what is needed to run the event.',
      'No fraudulent listings, bait-and-switch, or unsafe venues knowingly promoted.',
      'Follow Hampas Terms and Privacy Policy; admins may revoke organizer access for abuse.',
      'If you charge fees offline, state that clearly in the event description; Hampas does not process payments.',
    ],
    acceptLabel: SHARED_ACCEPT,
    noteLabel: 'Note to admin (optional)',
    notePlaceholder: 'Why you want this role, courts you run, experience, etc.',
    submitLabel: 'Submit request',
  },
};

export function getRoleRequestCopy(role: ElevatedRole): RoleRequestCopy {
  return ROLE_REQUEST_COPY[role];
}
