import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import ReportModal from '../components/ReportModal';
import * as reportsApi from '../api/reports';

vi.mock('../api/reports', () => ({
  getReportReasons: vi.fn(),
  submitReport: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 9, name: 'Me', email: 'me@example.com', birth_date: '2000-01-01', gender: 'male', is_admin: false },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

describe('ReportModal', () => {
  test('submits a report', async () => {
    const user = userEvent.setup();
    vi.mocked(reportsApi.getReportReasons).mockResolvedValue({
      reasons: ['fake_event', 'fake_organizer', 'inappropriate', 'spam', 'harassment', 'other'],
    });
    vi.mocked(reportsApi.submitReport).mockResolvedValue({ report: { id: 1 } });
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <ReportModal targetType="event" targetId={42} onClose={onClose} />
      </MemoryRouter>,
    );

    await screen.findByRole('option', { name: /fake event/i });

    await user.selectOptions(screen.getByLabelText(/reason/i), 'fake_event');
    await user.type(screen.getByLabelText(/details/i), 'This looks fake.');
    await user.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() =>
      expect(reportsApi.submitReport).toHaveBeenCalledWith({
        target_type: 'event',
        target_id: 42,
        reason: 'fake_event',
        details: 'This looks fake.',
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
