import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import CreateEventPage from '../pages/Events/CreateEventPage';
import * as eventsApi from '../api/events';

vi.mock('../api/events', () => ({
  getEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

describe('CreateEventPage', () => {
  test('submits a multipart form', async () => {
    const user = userEvent.setup();
    vi.mocked(eventsApi.createEvent).mockResolvedValue({} as never);

    render(
      <MemoryRouter>
        <CreateEventPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/title/i), 'Sunday Open Play');
    await user.type(screen.getByLabelText(/description/i), 'Casual games.');
    await user.selectOptions(screen.getByLabelText(/event type/i), 'open_play');
    await user.selectOptions(screen.getByLabelText(/skill level/i), 'all_levels');
    await user.type(screen.getByLabelText(/barangay/i), 'Malabanias');
    await user.type(screen.getByLabelText(/city/i), 'Angeles City');
    await user.type(screen.getByLabelText(/starts at/i), '2026-08-20T18:00');
    await user.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      const call = vi.mocked(eventsApi.createEvent).mock.calls[0]?.[0];
      expect(call).toBeInstanceOf(FormData);
      expect(call.get('title')).toBe('Sunday Open Play');
      expect(call.get('starts_at')).toBe('2026-08-20T18:00');
    });
  });
});
