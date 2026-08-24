import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
  resendVerificationEmail: vi.fn(),
}));

vi.mock('../api/csrf', () => ({
  ensureCsrfCookie: vi.fn().mockResolvedValue(undefined),
  apiOrigin: () => '',
}));

const STRONG = 'Passw0rd!';

describe('RegisterPage', () => {
  test('policy links open in a new tab so form inputs are kept', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    const privacy = screen.getByRole('link', { name: /privacy policy/i });
    const terms = screen.getByRole('link', { name: /terms of service/i });
    expect(privacy).toHaveAttribute('href', '/privacy');
    expect(privacy).toHaveAttribute('target', '_blank');
    expect(privacy).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(terms).toHaveAttribute('href', '/terms');
    expect(terms).toHaveAttribute('target', '_blank');
    expect(terms).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  test('blocks submit until consent checked and age is 18+', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/name/i), 'Test Player');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), STRONG);
    await user.type(screen.getByLabelText('Confirm password'), STRONG);
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

  test('weak password keeps create account disabled', async () => {
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
    await user.type(screen.getByLabelText(/date of birth/i), '2000-01-01');
    await user.selectOptions(screen.getByLabelText(/gender/i), 'male');
    await user.click(screen.getByLabelText(/privacy policy/i));
    await user.click(screen.getByLabelText(/terms of service/i));

    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  test('show password toggle changes input type', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getAllByRole('button', { name: /show password/i })[0]);
    expect(input).toHaveAttribute('type', 'text');
  });

  test('submits registration payload', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.register).mockResolvedValue({
      user: {
        id: 1,
        name: 'Test Player',
        email: 'a@b.com',
        birth_date: '2000-01-01',
        gender: 'male',
        is_admin: false,
      },
    });
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/name/i), 'Test Player');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), STRONG);
    await user.type(screen.getByLabelText('Confirm password'), STRONG);
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
          password: STRONG,
        }),
      ),
    );
  });
});

describe('LoginPage', () => {
  test('submits credentials', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: 1,
        name: 'A',
        email: 'a@b.com',
        birth_date: '2000-01-01',
        gender: 'male',
        is_admin: false,
      },
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

  test('login with from state returns to that path', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: 1,
        name: 'A',
        email: 'a@b.com',
        birth_date: '2000-01-01',
        gender: 'male',
        is_admin: false,
      },
    });

    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/login', state: { from: { pathname: '/events/9', search: '', hash: '' } } },
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/events/9" element={<div>Event 9</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Event 9')).toBeInTheDocument();
  });
});
