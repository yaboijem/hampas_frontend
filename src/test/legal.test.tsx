import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import PrivacyPolicy from '../pages/Legal/PrivacyPolicy';
import Terms from '../pages/Legal/Terms';

describe('legal pages', () => {
  test('privacy policy covers the DPA essentials', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText(/Data Privacy Act of 2012/i)).toBeInTheDocument();
    expect(screen.getByText(/distance, never exact location/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /right to delete/i })).toBeInTheDocument();
  });

  test('terms cover acceptable use and suspension', () => {
    render(<Terms />);
    expect(screen.getByRole('heading', { name: /acceptable use/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /suspension and termination/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /reporting and moderation/i })).toBeInTheDocument();
  });

  test('terms contact uses hampasapp@gmail.com', () => {
    render(<Terms />);
    const link = screen.getByRole('link', { name: /hampasapp@gmail\.com/i });
    expect(link).toHaveAttribute('href', 'mailto:hampasapp@gmail.com');
    expect(screen.queryByRole('link', { name: /@hampas\.app/i })).not.toBeInTheDocument();
  });

  test('privacy contacts use hampasapp@gmail.com only', () => {
    render(<PrivacyPolicy />);
    const links = screen.getAllByRole('link', { name: /hampasapp@gmail\.com/i });
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link).toHaveAttribute('href', 'mailto:hampasapp@gmail.com');
    }
    expect(screen.queryByRole('link', { name: /@hampas\.app/i })).not.toBeInTheDocument();
  });
});
