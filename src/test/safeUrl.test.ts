import { describe, expect, test } from 'vitest';
import { safeAppPath, safeHttpUrl } from '../lib/safeUrl';

describe('safeHttpUrl', () => {
  test('allows http and https', () => {
    expect(safeHttpUrl('https://facebook.com/x')).toBe('https://facebook.com/x');
    expect(safeHttpUrl('http://example.com')).toBe('http://example.com/');
  });

  test('blocks javascript and other schemes', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('data:text/html,hi')).toBeNull();
    expect(safeHttpUrl('')).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
});

describe('safeAppPath', () => {
  test('allows same-origin paths', () => {
    expect(safeAppPath('/admin/requests')).toBe('/admin/requests');
  });

  test('blocks open redirects', () => {
    expect(safeAppPath('//evil.com')).toBe('/');
    expect(safeAppPath('https://evil.com')).toBe('/');
    expect(safeAppPath('javascript:alert(1)')).toBe('/');
  });
});
