import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as reportsApi from '../api/reports';
import AdminReportsPage from '../pages/Admin/AdminReportsPage';
import { pageOf } from './adminPaginated';

vi.mock('../api/reports', () => ({
  listAdminReports: vi.fn(),
  getReportReasons: vi.fn(),
  submitReport: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/reports']}>
      <Routes>
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/events/:id" element={<div>Event detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.listAdminReports).mockResolvedValue(
      pageOf([
        {
          id: 3,
          reporter: { id: 2, name: 'Riley Reporter' },
          target_type: 'event',
          target_id: 42,
          reason: 'spam',
          details: 'Looks fake',
          created_at: '2026-08-20T10:00:00Z',
        },
      ]),
    );
  });

  test('lists reports with reason, reporter, details, and event link', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /^reports$/i })).toBeInTheDocument();
    expect(screen.getByText('Riley Reporter')).toBeInTheDocument();
    expect(screen.getByText('Spam')).toBeInTheDocument();
    expect(screen.getByText(/looks fake/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /event #42/i });
    expect(link).toHaveAttribute('href', '/events/42');
    await waitFor(() =>
      expect(reportsApi.listAdminReports).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 }),
      ),
    );
  });

  test('shows empty state', async () => {
    vi.mocked(reportsApi.listAdminReports).mockResolvedValue(pageOf([]));
    renderPage();
    expect(await screen.findByText(/no reports/i)).toBeInTheDocument();
  });
});
