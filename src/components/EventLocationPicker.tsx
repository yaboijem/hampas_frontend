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
  map.setView([lat, lng]);
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
    <div className="space-y-2">
      <p className="text-[11px] text-muted">Tap the map or drag the pin</p>
      <div className="overflow-hidden rounded-xl border border-border/80 ring-1 ring-border/40">
        <MapContainer
          center={[value.lat, value.lng]}
          zoom={15}
          className="h-52 w-full"
          scrollWheelZoom={!disabled}
          style={{ height: '13rem', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onUseMyLocation}
          disabled={locating || disabled}
          className="rounded-lg bg-cobalt px-3 py-1.5 text-xs font-bold text-white shadow-soft hover:bg-electric disabled:opacity-60"
        >
          {locating ? 'Locating…' : 'Use my location'}
        </button>
        {addressStatus === 'loading' ? (
          <span className="text-[11px] text-muted">Looking up address…</span>
        ) : addressStatus === 'error' ? (
          <span className="text-[11px] font-medium text-muted">
            Address unavailable — pin will still be saved
          </span>
        ) : address ? (
          <span className="text-[11px] font-semibold text-chip-text">{address}</span>
        ) : null}
        {locationError ? (
          <span role="alert" className="w-full text-[11px] font-medium text-red-600">
            {locationError}
          </span>
        ) : null}
      </div>
    </div>
  );
}
