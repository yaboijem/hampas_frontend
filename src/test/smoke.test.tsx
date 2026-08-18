import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { MemoryRouter } from 'react-router-dom';
import { ONBOARDING_STORAGE_KEY } from '../onboarding/storage';

beforeEach(() => {
  localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
});

test('app shell renders brand and navigation', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('navigation')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /hampas/i })).toBeInTheDocument();
  expect(screen.getByText(/find · play · enjoy/i)).toBeInTheDocument();
});

test('mobile menu toggles navigation links', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );

  const openMenu = screen.getByRole('button', { name: /open menu/i });
  await user.click(openMenu);

  expect(screen.getByRole('menu')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /^events$/i }).length).toBeGreaterThan(0);

  await user.click(screen.getByRole('button', { name: 'Close menu' }));
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

test('app shell exposes theme control', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('button', { name: /switch to (dark|light) mode/i })).toBeInTheDocument();
});
