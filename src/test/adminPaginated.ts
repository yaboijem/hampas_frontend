import type { Paginated } from '../api/types';

export function pageOf<T>(
  items: T[],
  meta?: Partial<Paginated<T>['meta']>,
): Paginated<T> {
  const total = meta?.total ?? items.length;
  const perPage = meta?.per_page ?? 10;
  const current = meta?.current_page ?? 1;
  const last = meta?.last_page ?? Math.max(1, Math.ceil(total / perPage) || 1);
  return {
    data: items,
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: current,
      last_page: last,
      per_page: perPage,
      total,
    },
  };
}
