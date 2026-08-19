import { describe, expect, test } from 'vitest';
import { isScrolledToBottom } from '../lib/scrollBottom';

describe('isScrolledToBottom', () => {
  test('true when content fits without scroll', () => {
    expect(
      isScrolledToBottom({ scrollTop: 0, clientHeight: 200, scrollHeight: 200 }),
    ).toBe(true);
  });

  test('false when not near bottom', () => {
    expect(
      isScrolledToBottom({ scrollTop: 0, clientHeight: 100, scrollHeight: 400 }),
    ).toBe(false);
  });

  test('true when scrolled near bottom', () => {
    expect(
      isScrolledToBottom({ scrollTop: 290, clientHeight: 100, scrollHeight: 400 }),
    ).toBe(true);
  });
});
