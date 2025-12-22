import axios from 'axios';
import { getToken, removeToken } from './token';

// Use correct env variable
const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + "/api"
  : "http://localhost:5000/api";

console.log("🔥 Using API BASE:", API_BASE);

const api = axios.create({
  baseURL: API_BASE,
});

// Attach token if present
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor for 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      removeToken();
      // Avoid redirect loops if already on login
      if (!window.location.pathname.includes('/login')) {
        // Simple redirect to generic login, or specific based on checking URL?
        // Let's go to default login, user can navigate
        window.location.href = '/login'; // Super admin / choice page
      }
    }
    return Promise.reject(error);
  }
);

export default api;
