// frontend/src/lib/api.js
import axios from 'axios';

// Base API URL
// Uses environment variable in production, falls back to localhost for development
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Axios instance
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false, // Set true if you use cookies
});

// Optional: intercept responses for errors
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

// EventSource helper for SSE
// Example: const evtSource = createEventSource('/stream/events');
export function createEventSource(path) {
  // Use the same base as API, remove '/api' if needed
  const base = API_BASE.replace(/\/api$/, '');
  const url = `${base}${path}`;
  return new EventSource(url);
}

export { API_BASE };
export default api;
