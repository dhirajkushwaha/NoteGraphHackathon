'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/Layout/ProtectedRoute';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { FileUploader } from '@/components/chat/FileUploader';
import { ChatMessage, StudySpace, File as FileType, SpaceStats, SpaceUser } from '@/types';
import { api } from '@/lib/api';
import { formatDate, formatFileSize } from '@/lib/utils';
import { LoadingSpinner } from '@/components/UI/LoadSpinner';
import { Modal } from '@/components/UI/Modal';
import { Input } from '@/components/UI/Input';
import { useAuth } from '@/context/AuthContext';
import { AddUserModal } from '@/components/UI/AddUserModal';

export default function SpaceDetailPage() {
  const { id } = useParams();
  const spaceId = Array.isArray(id) ? id[0] : id;
  
  const [space, setSpace] = useState<StudySpace | null>(null);
  const [files, setFiles] = useState<FileType[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<SpaceStats | null>(null);
  const [users, setUsers] = useState<SpaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'stats' | 'users'>('chat');
  const [showUpload, setShowUpload] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [userToRemove, setUserToRemove] = useState<string | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const { user } = useAuth();
  const currentUserId = user?.id;
 

  useEffect(() => {
    if (spaceId) {
      fetchSpaceData();
    }
  }, [spaceId]);

  const fetchSpaceData = async () => {
    try {
      setLoading(true);
      const [spaceRes, filesRes, chatsRes, statsRes, usersRes] = await Promise.all([
        api.get(`/spaces/${spaceId}`),
        api.get(`/spaces/${spaceId}/files`),
        api.get(`/spaces/${spaceId}/chats`),
        api.get(`/spaces/${spaceId}/stats`).catch(() => null),
        api.get(`/spaces/${spaceId}/users`).catch(() => ({ data: { users: [] } }))
      ]);
      
      setSpace(spaceRes.data);
      setFiles(filesRes.data.files || []);
      setChats(chatsRes.data.chats || []);
      setStats(statsRes?.data || null);
      setUsers(usersRes.data.users || []);
      console.log(spaceRes)
    } catch (error) {
      console.error('Failed to fetch space data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get(`/spaces/${spaceId}/users`);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoadingUsers(false);
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

  const handleAddUser = async (usernameOrEmail: string) => {
    setIsAddingUser(true);
    try {
      await api.post(`/spaces/${spaceId}/users`, { username_or_email: usernameOrEmail.trim() });
      fetchUsers();
      setAddUserModalOpen(false);
      return Promise.resolve();
    } catch (error: any) {
      console.error('Failed to add user:', error);
      throw new Error(error.response?.data?.detail || 'Failed to add user');
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    setUserToRemove(userId);
    setShowRemoveModal(true);
  };

  const confirmRemoveUser = async () => {
    if (!userToRemove) return;

    try {
      await api.delete(`/spaces/${spaceId}/users/${userToRemove}`);
      fetchUsers();
      alert('User removed successfully');
    } catch (error: any) {
      console.error('Failed to remove user:', error);
      alert(error.response?.data?.detail || 'Failed to remove user');
    } finally {
      setShowRemoveModal(false);
      setUserToRemove(null);
    }
  };

  const handleLeaveSpace = async () => {
    setIsLeaving(true);
    try {
      await api.post(`/spaces/${spaceId}/leave`);
      alert('You have left the space');
      window.location.href = '/spaces';
    } catch (error: any) {
      console.error('Failed to leave space:', error);
      alert(error.response?.data?.detail || 'Failed to leave space');
      setIsLeaving(false);
      setShowLeaveModal(false);
    }
  };

  const isOwner = currentUserId ? space?.created_by === currentUserId : false;

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
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                onClick={() => setShowUpload(!showUpload)}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {showUpload ? 'Hide Upload' : 'Upload Files'}
              </Button>
  
              {isOwner && (
                <Button
                  variant="primary"
                  onClick={() => setAddUserModalOpen(true)}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Add User
                </Button>
              )}
              {!isOwner && (
                <Button
                  variant="danger"
                  onClick={() => setShowLeaveModal(true)}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Leave Space
                </Button>
              )}
            </div>
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
            <button
              onClick={() => {
                setActiveTab('users');
                fetchUsers();
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Users
              <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                {users.length}
              </span>
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
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Users</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {users.length}
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

        {activeTab === 'users' && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Space Members ({users.length})
              </h3>
              {isOwner && (
                <Button
                  variant="primary"
                  onClick={() => setAddUserModalOpen(true)}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add User
                </Button>
              )}
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0c-.966.028-1.93.111-2.886.243-1.144.158-2.271.393-3.376.703a1.07 1.07 0 01-1.167-.236l-1.237-1.236a1.125 1.125 0 00-.622-.321 18.097 18.097 0 01-3.434-.433 1.08 1.08 0 01-.755-.758 1.078 1.078 0 01.244-1.066c.413-.5.75-1.055 1.005-1.646a18.007 18.007 0 01-.177-3.523 1.094 1.094 0 01.439-1.023 9 9 0 015.6.921c.41.184.85.314 1.307.38A9.025 9.025 0 0121 12c0 .532-.035 1.058-.103 1.575-.013.099-.026.197-.04.295M12 15v2m0-6V7m0 6h.01M12 12h.01" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No members yet
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {isOwner ? 'Add users to collaborate on this study space.' : 'Only you are in this space.'}
                </p>
                {isOwner && (
                  <Button
                    variant="primary"
                    onClick={() => setAddUserModalOpen(true)}
                  >
                    Add First User
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center mr-3">
                        <span className="font-semibold text-primary-600 dark:text-primary-400">
                          {user.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {user.username}
                          </h4>
                          {user.is_owner && (
                            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    {isOwner && !user.is_owner && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveUser(user.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Add User Modal */}
        <AddUserModal
          isOpen={addUserModalOpen}
          onClose={() => setAddUserModalOpen(false)}
          onSubmit={handleAddUser}
          loading={isAddingUser}
        />

        {/* Leave Space Modal */}
        <Modal
          isOpen={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          title="Leave Study Space"
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Are you sure?
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                    <p>
                      You will lose access to all files and chat history in this space.
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowLeaveModal(false)}
                disabled={isLeaving}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleLeaveSpace}
                disabled={isLeaving}
              >
                {isLeaving ? 'Leaving...' : 'Yes, Leave Space'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Remove User Modal */}
        <Modal
          isOpen={showRemoveModal}
          onClose={() => setShowRemoveModal(false)}
          title="Remove User"
        >
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                    Remove User
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                    <p>
                      Are you sure you want to remove this user from the space?
                      They will lose access to all files and chat history.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowRemoveModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmRemoveUser}
              >
                Remove User
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}