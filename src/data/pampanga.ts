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

/** Approximate city centers so events without a user pin still appear in Nearby. */
const CITY_CENTERS: Partial<Record<PampangaCity, { lat: number; lng: number }>> = {
  'Angeles City': { lat: 15.145, lng: 120.588 },
  'Mabalacat City': { lat: 15.2209, lng: 120.5983 },
  'San Fernando City': { lat: 15.0286, lng: 120.6897 },
  Apalit: { lat: 14.953, lng: 120.759 },
  Arayat: { lat: 15.149, lng: 120.769 },
  Bacolor: { lat: 15.0, lng: 120.65 },
  Candaba: { lat: 15.093, lng: 120.827 },
  Floridablanca: { lat: 14.974, lng: 120.508 },
  Guagua: { lat: 14.965, lng: 120.633 },
  Lubao: { lat: 14.94, lng: 120.6 },
  Macabebe: { lat: 14.908, lng: 120.715 },
  Magalang: { lat: 15.215, lng: 120.66 },
  Masantol: { lat: 14.896, lng: 120.709 },
  Mexico: { lat: 15.065, lng: 120.72 },
  Minalin: { lat: 14.968, lng: 120.683 },
  Porac: { lat: 15.071, lng: 120.542 },
  'San Luis': { lat: 15.04, lng: 120.792 },
  'San Simon': { lat: 14.995, lng: 120.78 },
  'Santa Ana': { lat: 15.094, lng: 120.767 },
  'Santa Rita': { lat: 14.999, lng: 120.615 },
  'Santo Tomas': { lat: 15.006, lng: 120.705 },
  Sasmuan: { lat: 14.938, lng: 120.623 },
};

export function cityCenter(city: string): { lat: number; lng: number } | null {
  const key = city.trim() as PampangaCity;
  return CITY_CENTERS[key] ?? null;
}
