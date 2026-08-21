import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { defaultMarkerIcon } from '../lib/leafletIcon';

export type LatLng = { lat: number; lng: number };

export type EventLocationPickerProps = {
  value: LatLng;
  onChange: (next: LatLng) => void;
  address: string | null;
  addressStatus: 'idle' | 'loading' | 'error';
  disabled?: boolean;
  onUseMyLocation: () => void;
  locating?: boolean;
  locationError?: string | null;
};

function ClickToPin({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    const zoom = typeof map.getZoom === 'function' ? map.getZoom() : 15;
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function EventLocationPicker({
  value,
  onChange,
  address,
  addressStatus,
  disabled = false,
  onUseMyLocation,
  locating = false,
  locationError = null,
}: EventLocationPickerProps) {
  return (
    <div className="space-y-2.5">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border/90 bg-surface shadow-soft ring-1 ring-cobalt/10">
        <div className="relative">
          <MapContainer
            center={[value.lat, value.lng]}
            zoom={15}
            className="event-map__leaflet h-56 w-full sm:h-60"
            scrollWheelZoom={!disabled}
            style={{ height: '100%', width: '100%', minHeight: '14rem' }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              attribution='&copy; OSM &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <Recenter lat={value.lat} lng={value.lng} />
            {!disabled ? <ClickToPin onPick={(lat, lng) => onChange({ lat, lng })} /> : null}
            <Marker
              position={[value.lat, value.lng]}
              icon={defaultMarkerIcon}
              draggable={!disabled}
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target;
                  const pos = m.getLatLng();
                  onChange({ lat: pos.lat, lng: pos.lng });
                },
              }}
            />
          </MapContainer>

          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-surface/50 to-transparent dark:from-surface/30"
            aria-hidden
          />

          <p className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-chip-text shadow-sm backdrop-blur-sm">
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 21s7-5.33 7-11a7 7 0 1 0-14 0c0 5.67 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            Tap map or drag pin
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-gradient-to-r from-ice/80 via-surface to-sky-tint/40 px-3 py-2.5">
          <button
            type="button"
            onClick={onUseMyLocation}
            disabled={locating || disabled}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-cobalt px-3 py-1.5 text-xs font-bold text-white shadow-soft transition hover:bg-electric disabled:opacity-60"
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            {locating ? 'Locating…' : 'Use my location'}
          </button>
          {addressStatus === 'loading' ? (
            <span className="text-[11px] font-medium text-muted">Looking up address…</span>
          ) : addressStatus === 'error' ? (
            <span className="text-[11px] font-medium text-muted">
              Address unavailable — pin will still be saved
            </span>
          ) : address ? (
            <span className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-chip-text">
              {address}
            </span>
          ) : null}
          {locationError ? (
            <span role="alert" className="w-full text-[11px] font-medium text-red-600">
              {locationError}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
