'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/Layout/ProtectedRoute';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { LoadingSpinner } from '@/components/UI/LoadSpinner';
import { Post, Comment, CreateCommentData } from '@/types';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function PostDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const postId = Array.isArray(id) ? id[0] : id;
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [downvoting, setDownvoting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { user } = useAuth();
  const currentUserId = user?.id;

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/posts/${postId}`);
      setPost(response.data);
    } catch (error: any) {
      console.error('Failed to fetch post:', error);
      if (error.response?.status === 403 || error.response?.status === 404) {
        router.push('/groups');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (upvoting || !post) return;
    
    setUpvoting(true);
    try {
      await api.post(`/posts/${postId}/upvote`);
      setPost({
        ...post,
        upvotes: post.upvotes + 1,
        user_upvoted: true,
        user_downvoted: false
      });
    } catch (error) {
      console.error('Failed to upvote:', error);
    } finally {
      setUpvoting(false);
    }
  };

  const handleDownvote = async () => {
    if (downvoting || !post) return;
    
    setDownvoting(true);
    try {
      await api.post(`/posts/${postId}/downvote`);
      setPost({
        ...post,
        downvotes: post.downvotes + 1,
        user_upvoted: false,
        user_downvoted: true
      });
    } catch (error) {
      console.error('Failed to downvote:', error);
    } finally {
      setDownvoting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      alert('Comment cannot be empty');
      return;
    }

    setCommenting(true);
    try {
      const commentData: CreateCommentData = {
        content: newComment.trim(),
        parentCommentId: replyTo || undefined
      };

      const response = await api.post(`/posts/${postId}/comments`, commentData);
      
      const newCommentObj: Comment = {
        _id: response.data.comment_id,
        postId: postId!,
        userId: currentUserId!,
        content: newComment.trim(),
        parentCommentId: replyTo || undefined,
        upvotes: 0,
        downvotes: 0,
        createdAt: new Date().toISOString(),
        author: {
          id: currentUserId!,
          username: user?.username || 'You'
        }
      };

      setPost(prev => prev ? {
        ...prev,
        comments: [newCommentObj, ...(prev.comments || [])],
        comment_count: (prev.comment_count || 0) + 1
      } : null);
      
      setNewComment('');
      setReplyTo(null);
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      alert(error.response?.data?.detail || 'Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyTo(commentId);
    setNewComment(`@${username} `);
    document.getElementById('comment-input')?.focus();
  };

  const navigateToGroup = () => {
    if (post?.group?.id) {
      router.push(`/groups/${post.group.id}`);
    } else if (post?.groupId) {
      router.push(`/groups/${post.groupId}`);
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

  if (!post) {
    return (
      <ProtectedRoute>
        <Card className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Post not found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The post you're looking for doesn't exist or you don't have access.
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
        {/* Post Header */}
        <Card className="p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={navigateToGroup}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to {post.group?.name || 'Group'}
              </Button>
              {post.is_pinned && (
                <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                  Pinned
                </span>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {post.title}
            </h1>
            
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
              <div className="flex items-center mr-4">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2">
                  <span className="text-sm font-medium">
                    {post.author?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">{post.author?.username || 'Unknown'}</span>
                  <div className="text-xs">{formatDate(post.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Post Content */}
          <div className="prose dark:prose-invert max-w-none mb-6">
            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {post.content}
            </div>
          </div>

          {/* Voting and Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleUpvote}
                  disabled={upvoting || post.user_upvoted}
                  className={post.user_upvoted ? 'bg-green-100 dark:bg-green-900' : ''}
                >
                  <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  Upvote ({post.upvotes})
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownvote}
                  disabled={downvoting || post.user_downvoted}
                  className={post.user_downvoted ? 'bg-red-100 dark:bg-red-900' : ''}
                >
                  <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Downvote ({post.downvotes})
                </Button>
              </div>
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span>{post.comment_count || post.comments?.length || 0} comments</span>
              </div>
            </div>
            
            <Button
              variant="secondary"
              onClick={() => document.getElementById('comment-input')?.focus()}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Add Comment
            </Button>
          </div>
        </Card>

        {/* Comments Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Comments ({post.comment_count || post.comments?.length || 0})
          </h2>

          {/* Add Comment Form */}
          <Card className="p-4 mb-6">
            <div className="space-y-3">
              <div>
                <textarea
                  id="comment-input"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyTo ? 'Write your reply...' : 'Write a comment...'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  disabled={commenting}
                />
              </div>
              <div className="flex justify-between items-center">
                {replyTo && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Replying to comment
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setReplyTo(null)}
                      className="ml-2"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                <Button
                  variant="primary"
                  onClick={handleAddComment}
                  disabled={commenting || !newComment.trim()}
                >
                  {commenting ? 'Posting...' : replyTo ? 'Post Reply' : 'Post Comment'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Comments List */}
          {post.comments && post.comments.length > 0 ? (
            <div className="space-y-4">
              {post.comments.map((comment) => (
                <Card key={comment._id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2">
                        <span className="text-sm font-medium">
                          {comment.author?.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {comment.author?.username || 'Unknown'}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(comment.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-gray-700 dark:text-gray-300 mb-3">
                    {comment.content}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => handleReply(comment._id, comment.author?.username || 'User')}
                      className="hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Reply
                    </button>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{comment.upvotes}</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{comment.downvotes}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No comments yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Be the first to comment on this post!
              </p>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}