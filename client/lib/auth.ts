import { jwtDecode } from 'jwt-decode';
import { api } from './api';

const TOKEN_KEY = 'graphrag_token';

export const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded: any = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
};

export const getCurrentUser = async () => {
  const response = await api.get('/me');
  return response.data;
};

export const isAuthenticated = (): boolean => {
  const token = getToken();
  if (!token) return false;
  
  return !isTokenExpired(token);
};