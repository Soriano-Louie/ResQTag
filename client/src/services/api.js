import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
