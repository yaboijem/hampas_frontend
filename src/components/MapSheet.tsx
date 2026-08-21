import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { defaultMarkerIcon } from '../lib/leafletIcon';

export type LatLng = { lat: number; lng: number };

export type MapSheetProps = {
  value: LatLng;
  onChange: (next: LatLng) => void;
  address: string | null;
  addressStatus: 'idle' | 'loading' | 'error';
  disabled?: boolean;
  onUseMyLocation: () => void;
  locating?: boolean;
  locationError?: string | null;
  onClose: () => void;
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
    const zoom = typeof map.getZoom === 'function' ? map.getZoom() : 16;
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, map]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const run = () => {
      if (typeof map.invalidateSize === 'function') map.invalidateSize();
    };
    const t = window.setTimeout(run, 50);
    const id = requestAnimationFrame(run);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(id);
    };
  }, [map]);
  return null;
}

export default function MapSheet({
  value,
  onChange,
  address,
  addressStatus,
  disabled = false,
  onUseMyLocation,
  locating = false,
  locationError = null,
  onClose,
}: MapSheetProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex min-h-dvh w-full items-stretch justify-center bg-navy/45 sm:items-center sm:p-safe-max-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-dvh w-full max-w-none flex-col overflow-hidden border-0 bg-surface text-navy shadow-soft sm:h-[min(92dvh,52rem)] sm:max-w-[min(100%,56rem)] sm:rounded-[var(--radius-card)] sm:border sm:border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
          <h2
            id={titleId}
            className="min-w-0 flex-1 font-display text-base font-bold tracking-tight sm:text-lg"
          >
            Pin venue
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-navy hover:border-cobalt"
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 text-sm font-bold text-white shadow-soft hover:bg-electric"
          >
            Done
          </button>
        </header>

        <div className="relative min-h-0 flex-1">
          <MapContainer
            center={[value.lat, value.lng]}
            zoom={16}
            className="event-map__leaflet absolute inset-0 h-full w-full"
            scrollWheelZoom={!disabled}
            style={{ height: '100%', width: '100%' }}
            zoomControl
            attributionControl={false}
          >
            <TileLayer
              attribution="&copy; OSM &copy; CARTO"
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <InvalidateSize />
            <Recenter lat={value.lat} lng={value.lng} />
            {!disabled ? <ClickToPin onPick={(lat, lng) => onChange({ lat, lng })} /> : null}
            <Marker
              position={[value.lat, value.lng]}
              icon={defaultMarkerIcon}
              draggable={!disabled}
              eventHandlers={{
                dragend: (e) => {
                  const pos = e.target.getLatLng();
                  onChange({ lat: pos.lat, lng: pos.lng });
                },
              }}
            />
          </MapContainer>

          <p className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-chip-text shadow-sm backdrop-blur-sm">
            Tap map or drag pin
          </p>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-gradient-to-r from-ice/80 via-surface to-sky-tint/40 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={onUseMyLocation}
            disabled={locating || disabled}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] bg-cobalt px-3 py-1.5 text-xs font-bold text-white shadow-soft hover:bg-electric disabled:opacity-60"
          >
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
        </footer>
      </div>
    </div>,
    document.body,
  );
}
