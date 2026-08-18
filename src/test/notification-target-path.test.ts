import { describe, expect, test } from 'vitest';
import { notificationTargetPath } from '../notifications/notificationTargetPath';
import type { AppNotification } from '../api/types';

const base = (overrides: Partial<AppNotification>): AppNotification => ({
  id: 1,
  message: 'x',
  type: 'application_decision',
  read_at: null,
  created_at: '2026-08-18T10:00:00Z',
  data: null,
  ...overrides,
});

describe('notificationTargetPath', () => {
  test('application_received goes to manage applications', () => {
    expect(
      notificationTargetPath(
        base({
          type: 'application_received',
          data: { event_id: 5, application_id: 9, applicant_name: 'Ana' },
        }),
      ),
    ).toBe('/events/5/applications');
  });

  test('application_decision goes to event detail', () => {
    expect(
      notificationTargetPath(
        base({
          type: 'application_decision',
          data: { event_id: 5, status: 'approved' },
        }),
      ),
    ).toBe('/events/5');
  });

  test('missing event_id returns null', () => {
    expect(notificationTargetPath(base({ type: 'application_received', data: {} }))).toBeNull();
    expect(notificationTargetPath(base({ data: null }))).toBeNull();
  });
});
