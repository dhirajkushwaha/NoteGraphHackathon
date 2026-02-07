'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/Layout/ProtectedRoute';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { FileUploader } from '@/components/chat/FileUploader';
import { ChatMessage, StudySpace, File as FileType, SpaceStats } from '@/types';
import { api } from '@/lib/api';
import { formatDate, formatFileSize } from '@/lib/utils';
import { LoadingSpinner } from '@/components/UI/LoadSpinner';

export default function SpaceDetailPage() {
  const { id } = useParams();
  const spaceId = Array.isArray(id) ? id[0] : id;
  
  const [space, setSpace] = useState<StudySpace | null>(null);
  const [files, setFiles] = useState<FileType[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<SpaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'stats'>('chat');
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (spaceId) {
      fetchSpaceData();
    }
  }, [spaceId]);

  const fetchSpaceData = async () => {
    try {
      setLoading(true);
      const [spaceRes, filesRes, chatsRes, statsRes] = await Promise.all([
        api.get(`/spaces/${spaceId}`),
        api.get(`/spaces/${spaceId}/files`),
        api.get(`/spaces/${spaceId}/chats`),
        api.get(`/spaces/${spaceId}/stats`).catch(() => null)
      ]);
      
      setSpace(spaceRes.data);
      setFiles(filesRes.data.files || []);
      setChats(chatsRes.data.chats || []);
      setStats(statsRes?.data || null);
    } catch (error) {
      console.error('Failed to fetch space data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    setSending(true);
    try {
      const response = await api.post(`/spaces/${spaceId}/chat`, { message });
      
      const newUserMessage: ChatMessage = {
        _id: `temp-${Date.now()}-user`,
        spaceId: spaceId!,
        author: 'You',
        authorType: 'user',
        text: message,
        createdAt: new Date().toISOString(),
      };
      
      const newAiMessage: ChatMessage = {
        _id: `temp-${Date.now()}-ai`,
        spaceId: spaceId!,
        author: 'AI',
        authorType: 'ai',
        text: response.data.answer,
        createdAt: new Date().toISOString(),
      };
      
      setChats([...chats, newUserMessage, newAiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleUploadComplete = () => {
    fetchSpaceData();
    setShowUpload(false);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await api.delete(`/spaces/${spaceId}/files/${fileId}`);
      setFiles(files.filter(file => file._id !== fileId));
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!space) {
    return (
      <ProtectedRoute>
        <Card className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Study space not found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The study space you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={() => window.history.back()}>
            Go Back
          </Button>
        </Card>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-8">
        {/* Space Header */}
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {space.subject}
              </h1>
              {space.topic && (
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {space.topic}
                </p>
              )}
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Created {formatDate(space.createdAt)}
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowUpload(!showUpload)}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {showUpload ? 'Hide Upload' : 'Upload Files'}
            </Button>
          </div>

          {showUpload && (
            <Card className="mt-4 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Upload Study Materials
              </h3>
              <FileUploader
                spaceId={spaceId!}
                onUploadComplete={handleUploadComplete}
              />
            </Card>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'chat'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Chat
              <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                {chats.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'files'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Files
              <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                {files.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Statistics
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'chat' && (
          <Card className="p-0 overflow-hidden">
            <div className="h-[600px]">
              <ChatWindow
                messages={chats}
                onSendMessage={handleSendMessage}
                loading={sending}
                spaceId={spaceId!}
              />
            </div>
          </Card>
        )}

        {activeTab === 'files' && (
          <div className="space-y-4">
            {files.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No files uploaded
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Upload files to start asking questions about your study materials.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file) => (
                  <Card key={file._id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-2">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {file.filename || 'Unnamed file'}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteFile(file._id)}
                        className="ml-2"
                      >
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Space Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Files</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stats.files}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Chat Messages</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stats.chats}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Graph Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Chunks</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stats.graph?.chunks || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Concepts</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stats.graph?.concepts || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Relationships</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stats.graph?.relationships || 0}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}