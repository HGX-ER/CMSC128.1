import axios from "axios";

const BACKEND_ROOT = import.meta.env.VITE_API_ROOT || "https://node-mysql-api-zsam.onrender.com";

const api = axios.create({
  baseURL: BACKEND_ROOT,   
  withCredentials: false,  
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export function createEventSource(path) {
  const url = `${BACKEND_ROOT}${path}`;
  return new EventSource(url);
}

export { BACKEND_ROOT };
export default api;
