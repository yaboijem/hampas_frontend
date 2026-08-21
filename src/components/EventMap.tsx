import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { googleMapsUrl } from '../lib/mapsLink';
import { defaultMarkerIcon } from '../lib/leafletIcon';

type Props = {
  lat: number;
  lng: number;
  className?: string;
};

export default function EventMap({ lat, lng, className = 'h-48 w-full' }: Props) {
  const href = googleMapsUrl(lat, lng);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open venue in Google Maps"
      className={`block overflow-hidden rounded-[var(--radius-card)] border border-border ${className}`}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        className="h-full w-full"
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={true}
        style={{ pointerEvents: 'none', height: '100%', width: '100%', minHeight: '12rem' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={defaultMarkerIcon} />
      </MapContainer>
    </a>
  );
}
