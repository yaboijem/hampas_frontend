import { describe, expect, test } from 'vitest';
import { ROLE_REQUEST_COPY, getRoleRequestCopy } from '../content/roleRequestCopy';

describe('roleRequestCopy', () => {
  test('coach and organizer have privileges and rules', () => {
    for (const role of ['coach', 'organizer'] as const) {
      const c = getRoleRequestCopy(role);
      expect(c.title.length).toBeGreaterThan(5);
      expect(c.privileges.length).toBeGreaterThan(2);
      expect(c.rules.length).toBeGreaterThan(2);
      expect(c.acceptLabel).toMatch(/accept/i);
    }
    expect(ROLE_REQUEST_COPY.coach.title).not.toBe(ROLE_REQUEST_COPY.organizer.title);
  });
});
