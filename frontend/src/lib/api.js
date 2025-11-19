import axios from "axios";

// Base URLs
const BACKEND_ROOT = import.meta.env.VITE_API_ROOT || "https://cmsc1281-production.up.railway.app";
const API_BASE = import.meta.env.VITE_API_URL || `${BACKEND_ROOT}/api`;

// Axios instance for REST API
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

// SSE helper
export function createEventSource(path) {
  const url = `${BACKEND_ROOT}${path}`; // do NOT add /api for SSE
  return new EventSource(url);
}

export { API_BASE, BACKEND_ROOT };
export default api;
