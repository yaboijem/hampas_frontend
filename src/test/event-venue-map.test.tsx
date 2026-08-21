import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import EventMap from '../components/EventMap';
import EventForm from '../pages/Events/EventForm';

vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    zoomControl,
  }: {
    children?: React.ReactNode;
    zoomControl?: boolean;
  }) => (
    <div data-testid={zoomControl ? 'sheet-map' : 'map'} data-zoom-control={String(!!zoomControl)}>
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

vi.mock('../lib/reverseGeocode', () => ({
  reverseGeocode: vi.fn().mockResolvedValue('Mock Address, Pampanga'),
}));

describe('EventMap', () => {
  test('links to Google Maps at coordinates', () => {
    render(<EventMap lat={15.1395} lng={120.5877} />);
    const link = screen.getByRole('link', { name: /open venue in google maps/i });
    expect(link).toHaveAttribute('href', 'https://www.google.com/maps?q=15.1395,120.5877');
    expect(link).toHaveAttribute('target', '_blank');
  });
});

describe('EventForm venue pin', () => {
  test('shows venue name field and map helper', () => {
    render(
      <MemoryRouter>
        <EventForm onSubmit={vi.fn()} submitLabel="Save" />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/venue name/i)).toBeInTheDocument();
    expect(screen.getByText(/tap map or drag pin/i)).toBeInTheDocument();
    expect(screen.queryByText(/optional · for nearby discovery/i)).not.toBeInTheDocument();
  });
});

describe('EventForm venue pin expand', () => {
  test('Expand map opens Pin venue dialog and hides compact map', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventForm onSubmit={vi.fn()} submitLabel="Save" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('map')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /expand map/i }));

    expect(screen.getByRole('dialog', { name: /pin venue/i })).toBeInTheDocument();
    expect(screen.queryByTestId('map')).not.toBeInTheDocument();
  });

  test('Done closes sheet and restores compact map', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventForm onSubmit={vi.fn()} submitLabel="Save" />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /expand map/i }));
    await user.click(screen.getByRole('button', { name: /^done$/i }));

    expect(screen.queryByRole('dialog', { name: /pin venue/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });
});
