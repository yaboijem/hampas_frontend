import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import EventMap from '../components/EventMap';
import EventForm from '../pages/Events/EventForm';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
  useMap: () => ({ setView: vi.fn(), getZoom: () => 15 }),
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
