import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
}

export function useApi<T = any>(endpoint: string, options: UseApiOptions<T> = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      switch (method) {
        case 'GET':
          response = await api.get(endpoint);
          break;
        case 'POST':
          response = await api.post(endpoint, body);
          break;
        case 'PUT':
          response = await api.put(endpoint, body);
          break;
        case 'DELETE':
          response = await api.delete(endpoint);
          break;
      }
      
      setData(response.data);
      options.onSuccess?.(response.data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred';
      setError(errorMessage);
      options.onError?.(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, options]);

  const refetch = useCallback(() => execute('GET'), [execute]);

  return { data, loading, error, execute, refetch };
}