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

  test('hides axios status code messages', () => {
    const err = new AxiosError('Request failed with status code 422');
    err.response = {
      data: {},
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: { headers: {} } as never,
    };
    expect(getApiErrorMessage(err, 'Login failed.')).toBe('Login failed.');
  });

  test('hides status code in API message body', () => {
    expect(
      getApiErrorMessage(axiosErr({ message: 'HTTP 500 Internal Server Error' }), 'Oops'),
    ).toBe('Oops');
  });
});
