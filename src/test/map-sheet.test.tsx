import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import MapSheet from '../components/MapSheet';

vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    zoomControl,
  }: {
    children?: React.ReactNode;
    zoomControl?: boolean;
  }) => (
    <div data-testid="sheet-map" data-zoom-control={String(!!zoomControl)}>
      {children}
    </div>
  ),
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
  useMap: () => ({
    setView: vi.fn(),
    getZoom: () => 15,
    invalidateSize: vi.fn(),
  }),
}));

vi.mock('../lib/leafletIcon', () => ({
  defaultMarkerIcon: {},
}));

const base = {
  value: { lat: 15.14, lng: 120.59 },
  onChange: vi.fn(),
  address: 'San Fernando, Pampanga',
  addressStatus: 'idle' as const,
  onUseMyLocation: vi.fn(),
  onClose: vi.fn(),
};

describe('MapSheet', () => {
  test('renders dialog titled Pin venue with address and Done', () => {
    render(<MapSheet {...base} />);
    expect(screen.getByRole('dialog', { name: /pin venue/i })).toBeInTheDocument();
    expect(screen.getByText(/san fernando, pampanga/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^done$/i })).toBeInTheDocument();
    expect(screen.getByTestId('sheet-map')).toHaveAttribute('data-zoom-control', 'true');
  });

  test('Done and Close call onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MapSheet {...base} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /^done$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    onClose.mockClear();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Escape calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MapSheet {...base} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Use my location button calls handler', async () => {
    const user = userEvent.setup();
    const onUseMyLocation = vi.fn();
    render(<MapSheet {...base} onUseMyLocation={onUseMyLocation} />);
    await user.click(screen.getByRole('button', { name: /use my location/i }));
    expect(onUseMyLocation).toHaveBeenCalledTimes(1);
  });

  test('locks body overflow while mounted', () => {
    const { unmount } = render(<MapSheet {...base} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
