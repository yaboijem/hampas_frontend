export const queryKeys = {
  events: {
    all: ['events'] as const,
    list: (filters: Record<string, unknown>) => ['events', 'list', filters] as const,
    nearby: (lat: number, lng: number, radiusKm: number) =>
      ['events', 'nearby', lat, lng, radiusKm] as const,
    detail: (id: number) => ['events', 'detail', id] as const,
  },
};
