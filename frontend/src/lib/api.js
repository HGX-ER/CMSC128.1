// frontend/src/lib/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: false,
});

api.interceptors.response.use(
  (r) => r,
  (err) => Promise.reject(err)
);

export default api;
