import { describe, expect, test } from 'vitest';
import { googleMapsUrl } from '../lib/mapsLink';

describe('googleMapsUrl', () => {
  test('builds Google Maps query URL', () => {
    expect(googleMapsUrl(15.1395, 120.5877)).toBe(
      'https://www.google.com/maps?q=15.1395,120.5877',
    );
  });
});
