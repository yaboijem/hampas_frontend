import { AxiosError } from 'axios';
import { describe, expect, test } from 'vitest';
import { getApiErrorMessage } from '../lib/apiError';

function axiosErr(data: unknown, status = 422): AxiosError {
  const err = new AxiosError('Request failed');
  err.response = {
    data,
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: {} } as never,
  };
  return err;
}

describe('getApiErrorMessage', () => {
  test('reads axios message', () => {
    expect(getApiErrorMessage(axiosErr({ message: 'Nope' }))).toBe('Nope');
  });

  test('reads first laravel errors entry', () => {
    expect(
      getApiErrorMessage(
        axiosErr({
          message: 'The given data was invalid.',
          errors: { email: ['Taken.'] },
        }),
      ),
    ).toBe('Taken.');
  });

  test('fallback', () => {
    expect(getApiErrorMessage({}, 'Fallback')).toBe('Fallback');
  });
});
