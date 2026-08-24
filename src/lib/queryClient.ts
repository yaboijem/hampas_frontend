import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient(options?: { retry?: boolean | number }): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: options?.retry ?? 1,
      },
    },
  });
}
