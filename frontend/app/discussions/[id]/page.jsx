'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeftIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

export default function DiscussionDetail() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [discussion, setDiscussion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadDiscussion();
    }
  }, [params.id]);

  const loadDiscussion = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/discussions/${params.id}`);
      setDiscussion(data.data);
    } catch (error) {
      console.error('Error loading discussion:', error);
      toast.error('Failed to load discussion');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async () => {
    try {
      const { data } = await axios.post(`/discussions/${params.id}/like`);
      setDiscussion(prev => ({
        ...prev,
        likes: Array(data.data.likes).fill(user.id)
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleToggleReplyLike = async (replyId) => {
    try {
      const { data } = await axios.post(
        `/discussions/${params.id}/replies/${replyId}/like`
      );
      setDiscussion(prev => ({
        ...prev,
        replies: prev.replies.map(reply =>
          reply._id === replyId
            ? { ...reply, likes: Array(data.data.likes).fill(user.id) }
            : reply
        )
      }));
    } catch (error) {
      console.error('Error toggling reply like:', error);
    }
  };

  const handleAddReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      setSubmitting(true);
      const { data } = await axios.post(`/discussions/${params.id}/replies`, {
        content: replyContent
      });
      setDiscussion(data.data);
      setReplyContent('');
      toast.success('Reply added successfully');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;

    try {
      await axios.delete(`/discussions/${params.id}/replies/${replyId}`);
      setDiscussion(prev => ({
        ...prev,
        replies: prev.replies.filter(reply => reply._id !== replyId)
      }));
      toast.success('Reply deleted successfully');
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast.error('Failed to delete reply');
    }
  };

  const handleDeleteDiscussion = async () => {
    if (!confirm('Are you sure you want to delete this discussion?')) return;

    try {
      await axios.delete(`/discussions/${params.id}`);
      toast.success('Discussion deleted successfully');
      router.push('/forums');
    } catch (error) {
      console.error('Error deleting discussion:', error);
      toast.error('Failed to delete discussion');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Discussion not found
          </h2>
          <button
            onClick={() => router.push('/forums')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            ← Back to Forums
          </button>
        </div>
      </div>
    );
  }

  const isAuthor = discussion.author._id === user.id;
  const canDelete = isAuthor || user.role === 'ADMIN';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/forums')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Back to Forums
      </button>

      {/* Discussion Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {discussion.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <img
                  src={discussion.author.profilePicture || '/default-avatar.png'}
                  alt={discussion.author.name}
                  className="w-8 h-8 rounded-full"
                />
                <span className="font-medium">{discussion.author.name}</span>
              </div>
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(discussion.createdAt), {
                  addSuffix: true
                })}
              </span>
              <span>•</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium">
                {discussion.category}
              </span>
            </div>
          </div>
          {canDelete && (
            <div className="flex gap-2">
              {isAuthor && !discussion.isLocked && (
                <button
                  onClick={() => router.push(`/discussions/${params.id}/edit`)}
                  className="p-2 text-gray-600 hover:text-blue-600"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={handleDeleteDiscussion}
                className="p-2 text-gray-600 hover:text-red-600"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className="prose dark:prose-invert max-w-none mb-4">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {discussion.content}
          </p>
        </div>

        {discussion.tags && discussion.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {discussion.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleToggleLike}
            className="flex items-center gap-2 hover:text-red-600"
          >
            {discussion.likes?.includes(user.id) ? (
              <HeartIconSolid className="h-5 w-5 text-red-600" />
            ) : (
              <HeartIcon className="h-5 w-5" />
            )}
            {discussion.likes?.length || 0} Likes
          </button>
          <div className="flex items-center gap-2">
            <ChatBubbleLeftIcon className="h-5 w-5" />
            {discussion.replies?.length || 0} Replies
          </div>
          <div className="flex items-center gap-2">
            <EyeIcon className="h-5 w-5" />
            {discussion.views || 0} Views
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Replies ({discussion.replies?.length || 0})
        </h2>

        {/* Reply Form */}
        {!discussion.isLocked && (
          <form onSubmit={handleAddReply} className="mb-6">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mb-2"
            />
            <button
              type="submit"
              disabled={!replyContent.trim() || submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : 'Post Reply'}
            </button>
          </form>
        )}

        {discussion.isLocked && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200">
              This discussion is locked. No new replies can be added.
            </p>
          </div>
        )}

        {/* Replies List */}
        <div className="space-y-4">
          {discussion.replies?.map((reply) => (
            <div
              key={reply._id}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src={reply.author.profilePicture || '/default-avatar.png'}
                    alt={reply.author.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {reply.author.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(reply.createdAt), {
                        addSuffix: true
                      })}
                    </div>
                  </div>
                </div>
                {(reply.author._id === user.id || user.role === 'ADMIN') && (
                  <button
                    onClick={() => handleDeleteReply(reply._id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">
                {reply.content}
              </p>
              <button
                onClick={() => handleToggleReplyLike(reply._id)}
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600"
              >
                {reply.likes?.includes(user.id) ? (
                  <HeartIconSolid className="h-4 w-4 text-red-600" />
                ) : (
                  <HeartIcon className="h-4 w-4" />
                )}
                {reply.likes?.length || 0}
              </button>
            </div>
          ))}
        </div>

        {(!discussion.replies || discussion.replies.length === 0) && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No replies yet. Be the first to reply!
          </p>
        )}
      </div>
    </div>
  );
}
