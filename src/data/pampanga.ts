/** Cities and municipalities in Pampanga (province-wide product scope). */
export const PAMPANGA_CITIES = [
  'Angeles City',
  'Apalit',
  'Arayat',
  'Bacolor',
  'Candaba',
  'Floridablanca',
  'Guagua',
  'Lubao',
  'Mabalacat City',
  'Macabebe',
  'Magalang',
  'Masantol',
  'Mexico',
  'Minalin',
  'Porac',
  'San Fernando City',
  'San Luis',
  'San Simon',
  'Santa Ana',
  'Santa Rita',
  'Santo Tomas',
  'Sasmuan',
] as const;

export type PampangaCity = (typeof PAMPANGA_CITIES)[number];

export const DEFAULT_EVENT_CITY: PampangaCity = 'Angeles City';

/** Approximate province center (San Fernando area) for weather / geo fallbacks. */
export const PAMPANGA_CENTER = { lat: 15.0286, lng: 120.6897 };

/** Nearby discovery radius covering most of the province from a local device. */
export const PAMPANGA_NEARBY_RADIUS_KM = 50;
