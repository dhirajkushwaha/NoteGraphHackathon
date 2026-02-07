import { jwtDecode } from 'jwt-decode';
import { api } from './api';

const TOKEN_KEY = 'graphrag_token';

// Type for decoded JWT token
interface DecodedToken {
  id: string;
  exp: number;
  iat?: number;
}

export const setToken = (token: string): void => {
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

export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<DecodedToken>(token);

    // Validate token structure
    if (!decoded.id || !decoded.exp) {
      return true;
    }

    // Check expiration (with 5-second buffer)
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Token decode error:', error);
    return true;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/me');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const isAuthenticated = (): boolean => {
  const token = getToken();
  if (!token) return false;

  // Check if token is valid and not expired
  if (isTokenExpired(token)) {
    removeToken();
    return false;
  }

  return true;
};

// Get token expiration time in seconds
export const getTokenExpiration = (): number | null => {
  const token = getToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode<DecodedToken>(token);
    return decoded.exp;
  } catch {
    return null;
  }
};
