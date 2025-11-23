import axios from "axios";

// Use only the root URL
const BACKEND_ROOT = import.meta.env.VITE_API_ROOT || "https://node-mysql-api-zsam.onrender.com";

// Axios instance for REST API
const api = axios.create({
  baseURL: BACKEND_ROOT,   // everything goes through BACKEND_ROOT
  withCredentials: false,  // set true if backend requires cookies
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

// SSE helper
export function createEventSource(path) {
  // SSE route is BACKEND_ROOT + path
  const url = `${BACKEND_ROOT}${path}`;
  return new EventSource(url);
}

export { BACKEND_ROOT };
export default api;
