'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/Layout/ProtectedRoute';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { LoadingSpinner } from '@/components/UI/LoadSpinner';
import { Modal } from '@/components/UI/Modal';
import { PostGroup, Post, CreatePostData } from '@/types';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function GroupDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const groupId = Array.isArray(id) ? id[0] : id;
  
  const [group, setGroup] = useState<PostGroup | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Post form state
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postTags, setPostTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const { user } = useAuth();
  const currentUserId = user?.id;

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
      fetchPosts();
    }
  }, [groupId, currentPage, sortBy]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/groups/${groupId}`);
      setGroup(response.data);
    } catch (error: any) {
      console.error('Failed to fetch group:', error);
      if (error.response?.status === 403 || error.response?.status === 404) {
        router.push('/groups');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const response = await api.get(`/groups/${groupId}/posts?skip=${(currentPage - 1) * 20}&limit=20&sort_by=${sortBy}`);
      if (currentPage === 1) {
        setPosts(response.data.posts || []);
      } else {
        setPosts(prev => [...prev, ...(response.data.posts || [])]);
      }
      setHasMore((response.data.posts?.length || 0) === 20);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleJoinGroup = async () => {
    setJoining(true);
    try {
      await api.post(`/groups/${groupId}/join`);
      fetchGroupData();
      alert('Successfully joined the group!');
    } catch (error: any) {
      console.error('Failed to join group:', error);
      alert(error.response?.data?.detail || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group? You will lose access to all posts.')) {
      return;
    }

    setLeaving(true);
    try {
      await api.post(`/groups/${groupId}/leave`);
      alert('You have left the group');
      router.push('/groups');
    } catch (error: any) {
      console.error('Failed to leave group:', error);
      alert(error.response?.data?.detail || 'Failed to leave group');
    } finally {
      setLeaving(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postTitle.trim() || !postContent.trim()) {
      alert('Title and content are required');
      return;
    }

    setCreatingPost(true);
    try {
      const postData: CreatePostData = {
        title: postTitle.trim(),
        content: postContent.trim(),
        tags: postTags.length > 0 ? postTags : undefined,
        files: [] // Add file upload functionality if needed
      };

      const response = await api.post(`/groups/${groupId}/posts`, postData);
      
      setPostTitle('');
      setPostContent('');
      setPostTags([]);
      setShowCreatePostModal(false);
      
      // Add new post to the list
      const newPost: Post = {
        ...response.data.post,
        _id: response.data.post_id,
        author: {
          id: user?.id || '',
          username: user?.username || 'You'
        },
        comment_count: 0
      };
      
      setPosts(prev => [newPost, ...prev]);
      alert('Post created successfully!');
    } catch (error: any) {
      console.error('Failed to create post:', error);
      alert(error.response?.data?.detail || 'Failed to create post');
    } finally {
      setCreatingPost(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !postTags.includes(tagInput.trim())) {
      setPostTags([...postTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setPostTags(postTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const loadMorePosts = () => {
    setCurrentPage(prev => prev + 1);
  };

  const isMember = group?.current_user_role === 'member' || 
                   group?.current_user_role === 'moderator' || 
                   group?.current_user_role === 'creator';
  const canPost = isMember || group?.is_public;

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!group) {
    return (
      <ProtectedRoute>
        <Card className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Group not found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The group you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={() => router.push('/groups')}>
            Back to Groups
          </Button>
        </Card>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-8">
        {/* Group Header */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {group.name}
                </h1>
                {!group.is_public && (
                  <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                    Private
                  </span>
                )}
              </div>
              
              {group.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {group.description}
                </p>
              )}
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2">
                    <span className="text-sm font-medium">
                      {group.created_by_user?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span>Created by {group.created_by_user?.username || 'Unknown'}</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0c-.966.028-1.93.111-2.886.243-1.144.158-2.271.393-3.376.703a1.07 1.07 0 01-1.167-.236l-1.237-1.236a1.125 1.125 0 00-.622-.321 18.097 18.097 0 01-3.434-.433 1.08 1.08 0 01-.755-.758 1.078 1.078 0 01.244-1.066c.413-.5.75-1.055 1.005-1.646a18.007 18.007 0 01-.177-3.523 1.094 1.094 0 01.439-1.023 9 9 0 015.6.921c.41.184.85.314 1.307.38A9.025 9.025 0 0121 12c0 .532-.035 1.058-.103 1.575-.013.099-.026.197-.04.295M12 15v2m0-6V7m0 6h.01M12 12h.01" />
                  </svg>
                  {group.member_count || group.members?.length || 0} members
                </div>
                <span>Created {formatDate(group.createdAt)}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {group.current_user_role === 'non_member' ? (
                <Button
                  variant="primary"
                  onClick={handleJoinGroup}
                  disabled={joining}
                >
                  {joining ? 'Joining...' : 'Join Group'}
                </Button>
              ) : (
                <>
                  {canPost && (
                    <Button
                      variant="primary"
                      onClick={() => setShowCreatePostModal(true)}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Post
                    </Button>
                  )}
                  {group.current_user_role !== 'creator' && (
                    <Button
                      variant="danger"
                      onClick={handleLeaveGroup}
                      disabled={leaving}
                    >
                      {leaving ? 'Leaving...' : 'Leave Group'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Posts Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Posts ({posts.length})
            </h2>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
              
              <Button
                variant="secondary"
                onClick={() => {
                  setCurrentPage(1);
                  fetchPosts();
                }}
                disabled={loadingPosts}
              >
                Refresh
              </Button>
            </div>
          </div>

          {!canPost && group.current_user_role === 'non_member' ? (
            <Card className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Join to view posts
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This is a private group. Join to see and participate in discussions.
              </p>
              <Button
                variant="primary"
                onClick={handleJoinGroup}
                disabled={joining}
              >
                {joining ? 'Joining...' : 'Join Group'}
              </Button>
            </Card>
          ) : loadingPosts && currentPage === 1 ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No posts yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Be the first to start a discussion in this group!
              </p>
              <Button
                variant="primary"
                onClick={() => setShowCreatePostModal(true)}
              >
                Create First Post
              </Button>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card
                    key={post._id}
                    className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/posts/${post._id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {post.title}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2">
                            <span className="text-xs font-medium">
                              {post.author?.username?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <span className="mr-3">{post.author?.username || 'Unknown'}</span>
                          <span>{formatDate(post.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {post.is_pinned && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                            Pinned
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {post.content}
                    </p>
                    
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>{post.upvotes}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>{post.downvotes}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          <span>{post.comment_count || post.comments?.length || 0} comments</span>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/posts/${post._id}`);
                        }}
                      >
                        View Post
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
              
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="secondary"
                    onClick={loadMorePosts}
                    disabled={loadingPosts}
                  >
                    {loadingPosts ? 'Loading...' : 'Load More Posts'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create Post Modal */}
        <Modal
          isOpen={showCreatePostModal}
          onClose={() => setShowCreatePostModal(false)}
          title="Create New Post"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <Input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Enter post title"
                className="w-full"
                disabled={creatingPost}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content *
              </label>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Write your post content..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={6}
                disabled={creatingPost}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Add a tag and press Enter"
                  className="flex-1"
                  disabled={creatingPost}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddTag}
                  disabled={creatingPost || !tagInput.trim()}
                >
                  Add
                </Button>
              </div>
              {postTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {postTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                        disabled={creatingPost}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowCreatePostModal(false)}
                disabled={creatingPost}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreatePost}
                disabled={creatingPost || !postTitle.trim() || !postContent.trim()}
              >
                {creatingPost ? 'Creating...' : 'Create Post'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}