import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import RegisterPage from '../pages/Auth/RegisterPage';
import LoginPage from '../pages/Auth/LoginPage';
import * as authApi from '../api/auth';

vi.mock('../api/auth', () => ({
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

describe('RegisterPage', () => {
  test('blocks submit until consent checked and age is 18+', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/name/i), 'Test Player');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.type(screen.getByLabelText('Confirm password'), 'password');
    await user.type(screen.getByLabelText(/date of birth/i), '2010-01-01');
    await user.selectOptions(screen.getByLabelText(/gender/i), 'male');

    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();

    await user.clear(screen.getByLabelText(/date of birth/i));
    await user.type(screen.getByLabelText(/date of birth/i), '2000-01-01');

    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();

    await user.click(screen.getByLabelText(/privacy policy/i));
    await user.click(screen.getByLabelText(/terms of service/i));

    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled();
  });

  test('submits registration payload', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.register).mockResolvedValue({
      token: 'tok',
      user: { id: 1, name: 'Test Player', email: 'a@b.com', birth_date: '2000-01-01', gender: 'male', is_admin: false },
    });
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/name/i), 'Test Player');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.type(screen.getByLabelText('Confirm password'), 'password');
    await user.type(screen.getByLabelText(/date of birth/i), '2000-01-01');
    await user.selectOptions(screen.getByLabelText(/gender/i), 'male');
    await user.click(screen.getByLabelText(/privacy policy/i));
    await user.click(screen.getByLabelText(/terms of service/i));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(authApi.register).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Player',
          birth_date: '2000-01-01',
          gender: 'male',
          privacy_policy_accepted: true,
          terms_accepted: true,
        }),
      ),
    );
  });
});

describe('LoginPage', () => {
  test('submits credentials', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockResolvedValue({
      token: 'tok',
      user: { id: 1, name: 'A', email: 'a@b.com', birth_date: '2000-01-01', gender: 'male', is_admin: false },
    });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith('a@b.com', 'password'));
  });
});
