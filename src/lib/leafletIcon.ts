import L from 'leaflet';

/** Brand pin (amber drop + white core) — shared by picker and detail map. */
export const defaultMarkerIcon = L.divIcon({
  className: 'hampas-map-pin',
  html: `<span class="hampas-map-pin__pulse" aria-hidden="true"></span><span class="hampas-map-pin__glyph" aria-hidden="true"><svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.82 0 1 5.82 1 13c0 9.75 11.2 21.6 11.68 22.1a1.5 1.5 0 0 0 2.14 0C15.3 34.6 27 22.75 27 13 27 5.82 21.18 0 14 0Z" fill="#d97706"/><path d="M14 0C6.82 0 1 5.82 1 13c0 9.75 11.2 21.6 11.68 22.1a1.5 1.5 0 0 0 2.14 0C15.3 34.6 27 22.75 27 13 27 5.82 21.18 0 14 0Z" fill="url(#hp)" fill-opacity=".35"/><circle cx="14" cy="13" r="5.5" fill="#fffbf0"/><circle cx="14" cy="13" r="3" fill="#d97706"/><defs><linearGradient id="hp" x1="14" y1="0" x2="14" y2="36" gradientUnits="userSpaceOnUse"><stop stop-color="#fbbf24"/><stop offset="1" stop-color="#b45309"/></linearGradient></defs></svg></span>`,
  iconSize: [36, 44],
  iconAnchor: [18, 42],
  popupAnchor: [0, -36],
});
