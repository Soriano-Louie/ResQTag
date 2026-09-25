import axios from 'axios';

const rawBase = import.meta.env.VITE_API_URL || '';
const normalizedBase = rawBase
  ? (rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api`)
  : '/api';

const api = axios.create({
  baseURL: normalizedBase,
  withCredentials: true, // Send HTTP-only cookie automatically
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for clear error message extraction
api.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
