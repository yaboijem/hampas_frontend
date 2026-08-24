import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { makeQueryClient } from '../lib/queryClient';

export function createTestQueryClient(): QueryClient {
  return makeQueryClient({ retry: false });
}

export function withQuery(ui: ReactNode, client?: QueryClient) {
  const qc = client ?? createTestQueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}
