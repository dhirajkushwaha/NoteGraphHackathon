import axios from 'axios';
import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on unauthorized
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);



// Helper function to extract error message from FastAPI responses
export function extractErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';
  
  // FastAPI validation errors
  if (error.response?.data?.detail) {
    if (Array.isArray(error.response.data.detail)) {
      return error.response.data.detail[0]?.msg || 'Validation error';
    }
    return error.response.data.detail;
  }
  
  // General API errors
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Network or other errors
  return error.message || 'An error occurred';
}