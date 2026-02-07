'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/Layout/ProtectedRoute';
import { Card } from '@/components/UI/Card';
import { Input } from '@/components/UI/Input';
import { Button } from '@/components/UI/Button';
import { api, extractErrorMessage } from '@/lib/api';

 

export default function CreateSpacePage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.subject.trim()) {
      setError('Subject is required');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/spaces', formData);
      router.push(`/spaces/${response.data.space_id}`);
    } catch (err: any) {
      // Use the extractErrorMessage helper
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 mb-4">
              <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New Study Space
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Organize your study materials by subject and topic
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-700 dark:text-red-400">{error}</span>
                </div>
              </div>
            )}

            <Input
              label="Subject *"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Machine Learning, Calculus, Biology"
              required
            />

            <Input
              label="Topic (Optional)"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="e.g., Neural Networks, Differential Equations, Genetics"
              helperText="Add a specific topic to help organize your studies"
            />

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={!formData.subject.trim()}
              >
                Create Space
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </ProtectedRoute>
  );
}