import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (dsn) {
  import('@sentry/react').then((Sentry) => {
    Sentry.init({ dsn });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
