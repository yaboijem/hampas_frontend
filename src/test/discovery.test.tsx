import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import EventsPage from '../pages/Events/EventsPage';
import * as discoveryApi from '../api/discovery';
import * as weatherApi from '../api/weather';
import type { EventItem } from '../api/types';

vi.mock('../api/discovery', () => ({
  listEvents: vi.fn(),
  nearbyEvents: vi.fn(),
}));

vi.mock('../api/weather', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/weather')>();
  return {
    ...actual,
    fetchWeather: vi.fn(),
  };
});

const event = (overrides: Partial<EventItem> = {}): EventItem => ({
  id: 1,
  title: 'Sunday Open Play',
  description: 'x',
  event_type: 'open_play',
  skill_level: 'all_levels',
  barangay: 'Malabanias',
  city: 'Angeles City',
  starts_at: '2026-08-20T18:00:00+08:00',
  photo_url: null,
  visibility: 'live',
  is_owner: false,
  my_application: null,
  created_by: { id: 2, name: 'Org' },
  ...overrides,
});

beforeEach(() => {
  vi.mocked(weatherApi.fetchWeather).mockResolvedValue({
    tempC: 31,
    windKmh: 12,
    rainChancePct: 20,
    condition: 'sunny',
  });
});

afterEach(() => vi.restoreAllMocks());

function stubGeolocation(impl: (success: PositionCallback, error?: PositionErrorCallback) => void) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: impl },
  });
}

describe('EventsPage', () => {
  test('uses nearby endpoint when geolocation granted', async () => {
    stubGeolocation((success) =>
      success({ coords: { latitude: 15.1395, longitude: 120.5877 } } as GeolocationPosition),
    );
    vi.mocked(discoveryApi.nearbyEvents).mockResolvedValue({
      data: [event({ distance_km: 2.4 })],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
    });

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Sunday Open Play/i)).toBeInTheDocument();
    expect(screen.getByText(/2.4 km away/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(discoveryApi.nearbyEvents).toHaveBeenCalledWith(15.1395, 120.5877, 50),
    );
  });

  test('falls back to province-center nearby when geolocation denied', async () => {
    stubGeolocation((_success, error) =>
      error?.({ code: 1, message: 'denied' } as GeolocationPositionError),
    );
    vi.mocked(discoveryApi.nearbyEvents).mockResolvedValue({
      data: [event({ distance_km: 12 })],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
    });

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Sunday Open Play/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/location/i);
    await waitFor(() =>
      expect(discoveryApi.nearbyEvents).toHaveBeenCalledWith(15.0286, 120.6897, 50),
    );
  });

  test('applies type and skill filters client-side on nearby results', async () => {
    stubGeolocation((_success, error) =>
      error?.({ code: 1, message: 'denied' } as GeolocationPositionError),
    );
    vi.mocked(discoveryApi.nearbyEvents).mockResolvedValue({
      data: [
        event({ id: 1, title: 'Sunday Open Play', event_type: 'open_play', skill_level: 'all_levels' }),
        event({
          id: 2,
          title: 'Friday League Night',
          event_type: 'league',
          skill_level: 'intermediate',
        }),
      ],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Sunday Open Play/i)).toBeInTheDocument();
    const callsBefore = vi.mocked(discoveryApi.nearbyEvents).mock.calls.length;

    await user.click(screen.getByRole('button', { name: /^filters$/i }));
    await user.click(screen.getByRole('button', { name: /event type/i }));
    await user.click(screen.getByRole('option', { name: /^league$/i }));
    await user.click(screen.getByRole('button', { name: /skill level/i }));
    await user.click(screen.getByRole('option', { name: /^intermediate$/i }));

    expect(screen.queryByText(/Sunday Open Play/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Friday League Night/i)).toBeInTheDocument();
    expect(discoveryApi.nearbyEvents).toHaveBeenCalledTimes(callsBefore);
  });

  test('applies type filter on nearby results without re-fetching', async () => {
    stubGeolocation((success) =>
      success({ coords: { latitude: 15.1395, longitude: 120.5877 } } as GeolocationPosition),
    );
    vi.mocked(discoveryApi.nearbyEvents).mockResolvedValue({
      data: [
        event({ id: 1, title: 'Sunday Open Play', event_type: 'open_play' }),
        event({ id: 2, title: 'Friday League Night', event_type: 'league', skill_level: 'intermediate' }),
      ],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Sunday Open Play/i)).toBeInTheDocument();
    expect(screen.getByText(/Friday League Night/i)).toBeInTheDocument();
    const callsBeforeFilter = vi.mocked(discoveryApi.nearbyEvents).mock.calls.length;

    await user.click(screen.getByRole('button', { name: /^filters$/i }));
    await user.click(screen.getByRole('button', { name: /event type/i }));
    await user.click(screen.getByRole('option', { name: /^league$/i }));

    expect(screen.queryByText(/Sunday Open Play/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Friday League Night/i)).toBeInTheDocument();
    expect(discoveryApi.nearbyEvents).toHaveBeenCalledTimes(callsBeforeFilter);
  });

  test('client-side search filters loaded events by title', async () => {
    stubGeolocation((_success, error) =>
      error?.({ code: 1, message: 'denied' } as GeolocationPositionError),
    );
    vi.mocked(discoveryApi.nearbyEvents).mockResolvedValue({
      data: [
        event({ id: 1, title: 'Sunday Open Play' }),
        event({ id: 2, title: 'Friday League Night' }),
      ],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Sunday Open Play/i)).toBeInTheDocument();
    expect(screen.getByText(/Friday League Night/i)).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox'), 'league');

    expect(screen.queryByText(/Sunday Open Play/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Friday League Night/i)).toBeInTheDocument();
  });

  test('hero uses court photo background', async () => {
    stubGeolocation((success) =>
      success({ coords: { latitude: 15.1395, longitude: 120.5877 } } as GeolocationPosition),
    );
    vi.mocked(discoveryApi.nearbyEvents).mockResolvedValue({
      data: [event({ distance_km: 2.4 })],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
    });

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>,
    );

    const hero = await screen.findByTestId('events-hero');
    expect(hero).toBeInTheDocument();
    const bg =
      hero.style.backgroundImage ||
      getComputedStyle(hero).backgroundImage ||
      hero.className;
    expect(String(bg)).toMatch(/courtwball\.jpg/);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /find a game/i })).toBeInTheDocument();
  });
});
