'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/Layout/ProtectedRoute';
import { SpaceList } from '@/components/Spaces/SpaceList';
import { Button } from '@/components/UI/Button';
import { Modal } from '@/components/UI/Modal';
import { Input } from '@/components/UI/Input';
import { StudySpace } from '@/types';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function SpacesPage() {
    const [spaces, setSpaces] = useState<StudySpace[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newSpace, setNewSpace] = useState({
        subject: '',
        topic: '',
    });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSpaces();
    }, []);

    const fetchSpaces = async () => {
        try {
            const response = await api.get('/spaces');
            setSpaces(response.data.spaces || []);
        } catch (error) {
            console.error('Failed to fetch spaces:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSpace = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setCreating(true);

        try {
            const formData = new FormData();
            formData.append('subject', newSpace.subject);
            if (newSpace.topic) {
                formData.append('topic', newSpace.topic);
            }

            const response = await api.post('/spaces', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Create a proper StudySpace object with all required properties
            const newSpaceObj: StudySpace = {
                _id: response.data.space_id,
                subject: newSpace.subject,
                topic: newSpace.topic,
                users: [], // Add empty users array (will be populated from backend)
                createdAt: new Date().toISOString(),
            };

            setSpaces([...spaces, newSpaceObj]);
            setNewSpace({ subject: '', topic: '' });
            setIsCreateModalOpen(false);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to create space');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteSpace = async (spaceId: string) => {
        if (!confirm('Are you sure you want to delete this study space? All associated files and chats will also be deleted.')) {
            return;
        }

        try {
            await api.delete(`/spaces/${spaceId}`);
            setSpaces(spaces.filter(space => space._id !== spaceId));
        } catch (error) {
            console.error('Failed to delete space:', error);
            alert('Failed to delete space. Please try again.');
        }
    };

    return (
        <ProtectedRoute>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Study Spaces
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Organize your study materials by subject
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Space
                    </Button>
                </div>

                {/* Spaces List */}
                <SpaceList
                    spaces={spaces}
                    loading={loading}
                    onDelete={handleDeleteSpace}
                    emptyMessage="Create your first study space to get started"
                />

                {/* Create Space Modal */}
                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title="Create New Study Space"
                >
                    <form onSubmit={handleCreateSpace} className="space-y-6">
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
                            value={newSpace.subject}
                            onChange={(e) => setNewSpace({ ...newSpace, subject: e.target.value })}
                            placeholder="e.g., Machine Learning, Calculus, Biology"
                            required
                        />

                        <Input
                            label="Topic (Optional)"
                            value={newSpace.topic}
                            onChange={(e) => setNewSpace({ ...newSpace, topic: e.target.value })}
                            placeholder="e.g., Neural Networks, Differential Equations, Genetics"
                        />

                        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsCreateModalOpen(false)}
                                disabled={creating}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                loading={creating}
                                disabled={!newSpace.subject.trim()}
                            >
                                Create Space
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </ProtectedRoute>
    );
}