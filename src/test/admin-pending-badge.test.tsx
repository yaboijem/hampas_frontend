import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import AdminPendingBadge from '../components/AdminPendingBadge';

describe('AdminPendingBadge', () => {
  test('renders nothing when count is 0', () => {
    const { container } = render(<AdminPendingBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('shows count and caps at 99+', () => {
    const { rerender } = render(<AdminPendingBadge count={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    rerender(<AdminPendingBadge count={100} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});
