import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { googleMapsUrl } from '../lib/mapsLink';
import { defaultMarkerIcon } from '../lib/leafletIcon';

type Props = {
  lat: number;
  lng: number;
  className?: string;
};

export default function EventMap({ lat, lng, className = '' }: Props) {
  const href = googleMapsUrl(lat, lng);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open venue in Google Maps"
      className={[
        'event-map group relative block overflow-hidden rounded-[var(--radius-card)]',
        'border border-border/90 bg-surface shadow-soft',
        'ring-1 ring-cobalt/10 transition duration-200',
        'hover:-translate-y-0.5 hover:border-cobalt/35 hover:shadow-md hover:ring-cobalt/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50',
        'motion-reduce:transform-none',
        className,
      ].join(' ')}
    >
      <div className="relative aspect-[16/10] w-full min-h-[12.5rem] sm:min-h-[14rem]">
        <MapContainer
          center={[lat, lng]}
          zoom={16}
          className="event-map__leaflet absolute inset-0 h-full w-full"
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          zoomControl={false}
          attributionControl={false}
          keyboard={false}
          style={{ pointerEvents: 'none', height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OSM &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <Marker position={[lat, lng]} icon={defaultMarkerIcon} />
        </MapContainer>

        {/* Soft vignette so the CTA and pin read clearly */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/45 via-navy/5 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-surface/40 to-transparent dark:from-surface/20"
          aria-hidden
        />

        <span className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 sm:left-4 sm:right-4 sm:bottom-4">
          <span className="inline-flex max-w-[65%] items-center gap-1.5 rounded-full border border-white/25 bg-navy/75 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white shadow-soft backdrop-blur-sm dark:bg-navy/90">
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-electric"
              aria-hidden
            >
              <path d="M12 21s7-5.33 7-11a7 7 0 1 0-14 0c0 5.67 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            Venue pin
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cobalt px-3 py-1.5 text-xs font-bold text-white shadow-soft transition group-hover:bg-electric group-hover:brightness-105">
            Open in Maps
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 opacity-95 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none"
              aria-hidden
            >
              <path d="M7 17 17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </span>
        </span>
      </div>
    </a>
  );
}
