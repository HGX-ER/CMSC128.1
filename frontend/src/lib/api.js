import axios from 'axios';

// Base API URL
const API_BASE = import.meta.env.VITE_API_URL || 'https://cmsc1281-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false, // set true if you use cookies
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

// SSE helper
export function createEventSource(path) {
  const base = API_BASE.replace(/\/api$/, ''); // remove /api for SSE
  const url = `${base}${path}`;
  return new EventSource(url);
}

export { API_BASE };
export default api;
