import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as profilesApi from '../api/profiles';
import RoleRequestModal from '../components/RoleRequestModal';

vi.mock('../api/profiles', () => ({
  createRoleRequest: vi.fn(),
}));

describe('RoleRequestModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows coach copy and blocks submit until accept', async () => {
    const user = userEvent.setup();
    render(<RoleRequestModal role="coach" onClose={vi.fn()} />);

    expect(
      await screen.findByRole('dialog', { name: /request coach access/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^privileges$/i)).toBeInTheDocument();
    expect(screen.getByText(/^rules$/i)).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: /submit request/i });
    expect(submit).toBeDisabled();

    const accept = screen.getByRole('checkbox', {
      name: /accept the privileges and rules/i,
    });
    await waitFor(() => expect(accept).not.toBeDisabled());
    await user.click(accept);
    expect(submit).not.toBeDisabled();
  });

  test('submits role with optional note', async () => {
    const user = userEvent.setup();
    const onSubmitted = vi.fn();
    const onClose = vi.fn();
    vi.mocked(profilesApi.createRoleRequest).mockResolvedValue({
      id: 1,
      role: 'organizer',
      status: 'pending',
      note: 'I run Capel',
      created_at: '2026-08-19T00:00:00Z',
    });

    render(
      <RoleRequestModal
        role="organizer"
        onClose={onClose}
        onSubmitted={onSubmitted}
      />,
    );
    await screen.findByRole('dialog', { name: /request organizer access/i });

    const accept = screen.getByRole('checkbox', { name: /accept/i });
    await waitFor(() => expect(accept).not.toBeDisabled());
    await user.click(accept);
    await user.type(screen.getByLabelText(/note to admin/i), 'I run Capel');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() =>
      expect(profilesApi.createRoleRequest).toHaveBeenCalledWith({
        role: 'organizer',
        note: 'I run Capel',
      }),
    );
    expect(onSubmitted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test('omits empty note', async () => {
    const user = userEvent.setup();
    vi.mocked(profilesApi.createRoleRequest).mockResolvedValue({
      id: 2,
      role: 'coach',
      status: 'pending',
      note: null,
      created_at: '2026-08-19T00:00:00Z',
    });
    render(<RoleRequestModal role="coach" onClose={vi.fn()} />);
    await screen.findByRole('dialog', { name: /coach/i });
    const accept = screen.getByRole('checkbox', { name: /accept/i });
    await waitFor(() => expect(accept).not.toBeDisabled());
    await user.click(accept);
    await user.click(screen.getByRole('button', { name: /submit request/i }));
    await waitFor(() =>
      expect(profilesApi.createRoleRequest).toHaveBeenCalledWith({
        role: 'coach',
      }),
    );
  });
});
