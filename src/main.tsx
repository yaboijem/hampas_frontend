import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import 'leaflet/dist/leaflet.css';
import App from './App';
import { makeQueryClient } from './lib/queryClient';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (dsn) {
  import('@sentry/react').then((Sentry) => {
    Sentry.init({ dsn });
  });
}

const queryClient = makeQueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
