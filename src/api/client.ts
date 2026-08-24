import axios from 'axios';
import { API_BASE_URL } from '../config';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

let handlingUnauthorized = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = String(error.config?.url ?? '');
      const isAuthAttempt =
        url.includes('/login') ||
        url.includes('/register') ||
        url.includes('/forgot-password');
      if (!isAuthAttempt && !handlingUnauthorized) {
        handlingUnauthorized = true;
        window.dispatchEvent(new CustomEvent('hampas:unauthorized'));
        handlingUnauthorized = false;
      }
    }
    return Promise.reject(error);
  },
);
