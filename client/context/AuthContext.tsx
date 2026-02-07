'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { getToken, setToken, removeToken, getCurrentUser } from '@/lib/auth';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getToken();
    if (token) {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Auth check failed:', error);
        removeToken();
      }
    }
    setLoading(false);
  };

const login = async (email: string, password: string) => {
  setLoading(true);
  try {
    // Your backend expects 'email' not 'username' for login
    const payload = new URLSearchParams();
    payload.append('email', email);  // Changed from 'username' to 'email'
    payload.append('password', password);

    console.log('=== LOGIN DEBUG ===');
    console.log('Login payload:', payload.toString());
    
    const response = await api.post(
      '/login',
      payload.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    console.log('Login response:', response.data);
    
    const { access_token, user: userData } = response.data;
    
    setToken(access_token);
    setUser(userData);
  } catch (error: any) {
    console.error('=== LOGIN ERROR ===');
    console.error('Error:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    throw new Error(error.response?.data?.detail || 'Login failed');
  } finally {
    setLoading(false);
  }
};

const register = async (data: { email: string; username: string; password: string }) => {
  setLoading(true);
  try {
    console.log('=== REGISTER DEBUG ===');
    console.log('Data received:', data);
    console.log('Email:', data.email);
    console.log('Username:', data.username);
    console.log('Password length:', data.password.length);
    console.log('Password (first 20 chars):', data.password.substring(0, 20));
    
    const payload = new URLSearchParams();
    payload.append('email', data.email);
    payload.append('username', data.username);
    payload.append('password', data.password);
    
    console.log('Payload string:', payload.toString());
    
    const response = await api.post(
      '/register',
      payload.toString(),
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        } 
      }
    );
    
    console.log('Response:', response.data);
    // ... rest of code
  } catch (error: any) {
    console.error('=== REGISTER ERROR ===');
    console.error('Error:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Error headers:', error.response?.headers);
    throw new Error(error.response?.data?.detail || 'Registration failed');
  } finally {
    setLoading(false);
  }
};


  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      removeToken();
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Refresh user failed:', error);
      removeToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};