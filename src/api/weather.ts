export type WeatherCondition = 'sunny' | 'cloudy' | 'rain' | 'storm';

export type WeatherSnapshot = {
  tempC: number;
  windKmh: number;
  rainChancePct: number | null;
  condition: WeatherCondition;
};

/** Map WMO weather codes (Open-Meteo) to a simple UI condition. */
export function conditionFromWeatherCode(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'sunny';
  if (code >= 95) return 'storm';
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 85 && code <= 86)
  ) {
    return 'rain';
  }
  return 'cloudy';
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('current', 'temperature_2m,wind_speed_10m,weather_code');
  url.searchParams.set('hourly', 'precipitation_probability');
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('wind_speed_unit', 'kmh');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Weather unavailable');

  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number;
      wind_speed_10m?: number;
      weather_code?: number;
    };
    hourly?: { precipitation_probability?: Array<number | null> };
  };

  const temp = data.current?.temperature_2m;
  const wind = data.current?.wind_speed_10m;
  if (typeof temp !== 'number' || typeof wind !== 'number') {
    throw new Error('Weather data incomplete');
  }

  const code = data.current?.weather_code;
  const rain = data.hourly?.precipitation_probability?.[0];

  return {
    tempC: Math.round(temp),
    windKmh: Math.round(wind),
    rainChancePct: typeof rain === 'number' ? Math.round(rain) : null,
    condition: typeof code === 'number' ? conditionFromWeatherCode(code) : 'cloudy',
  };
}
