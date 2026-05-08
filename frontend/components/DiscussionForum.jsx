'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  PlusIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  HeartIcon,
  MapPinIcon as PinIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, MapPinIcon as PinIconSolid } from '@heroicons/react/24/solid';

const CATEGORIES = [
  { value: 'ALL', label: 'All Discussions' },
  { value: 'GENERAL', label: 'General' },
  { value: 'COURSEWORK', label: 'Coursework' },
  { value: 'ASSIGNMENTS', label: 'Assignments' },
  { value: 'EXAMS', label: 'Exams' },
  { value: 'PROJECTS', label: 'Projects' },
  { value: 'RESOURCES', label: 'Resources' },
  { value: 'ANNOUNCEMENTS', label: 'Announcements' },
  { value: 'HELP', label: 'Help & Support' }
];

export default function DiscussionForum({ departmentId }) {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDiscussions, setTotalDiscussions] = useState(0);
  const LIMIT = 20;
  const [showNewDiscussionForm, setShowNewDiscussionForm] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    content: '',
    category: 'GENERAL',
    tags: ''
  });

  useEffect(() => {
    setPage(1);
  }, [departmentId, selectedCategory, searchQuery]);

  useEffect(() => {
    loadDiscussions();
  }, [departmentId, selectedCategory, searchQuery, page]);

  const loadDiscussions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);

      const { data } = await axios.get(
        `/discussions/department/${departmentId}?${params.toString()}`
      );
      setDiscussions(data.data.discussions);
      setTotalPages(data.data.totalPages);
      setTotalDiscussions(data.data.totalDiscussions);
    } catch (error) {
      console.error('Error loading discussions:', error);
      toast.error('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscussion = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post('/discussions', {
        ...newDiscussion,
        department: departmentId,
        tags: newDiscussion.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      });

      setDiscussions([data.data, ...discussions]);
      setNewDiscussion({ title: '', content: '', category: 'GENERAL', tags: '' });
      setShowNewDiscussionForm(false);
      toast.success('Discussion created successfully');
    } catch (error) {
      console.error('Error creating discussion:', error);
      toast.error('Failed to create discussion');
    }
  };

  const handleToggleLike = async (discussionId) => {
    try {
      const { data } = await axios.post(`/discussions/${discussionId}/like`);
      setDiscussions(prev =>
        prev.map(disc =>
          disc._id === discussionId
            ? { ...disc, likes: Array(data.data.likes).fill(user.id) }
            : disc
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleTogglePin = async (discussionId) => {
    try {
      await axios.put(`/discussions/${discussionId}/pin`);
      loadDiscussions();
      toast.success('Discussion pin status updated');
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update pin status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Discussion Forum
          </h1>
          <button
            onClick={() => setShowNewDiscussionForm(!showNewDiscussionForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5" />
            New Discussion
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* New Discussion Form */}
      {showNewDiscussionForm && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Create New Discussion
          </h2>
          <form onSubmit={handleCreateDiscussion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={newDiscussion.title}
                onChange={(e) =>
                  setNewDiscussion({ ...newDiscussion, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="What's your question or topic?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={newDiscussion.category}
                onChange={(e) =>
                  setNewDiscussion({ ...newDiscussion, category: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {CATEGORIES.slice(1).map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content
              </label>
              <textarea
                required
                rows={6}
                value={newDiscussion.content}
                onChange={(e) =>
                  setNewDiscussion({ ...newDiscussion, content: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Provide details about your discussion..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={newDiscussion.tags}
                onChange={(e) =>
                  setNewDiscussion({ ...newDiscussion, tags: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., python, data-structures, homework"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Post Discussion
              </button>
              <button
                type="button"
                onClick={() => setShowNewDiscussionForm(false)}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Discussions List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : discussions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <ChatBubbleLeftIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No discussions yet
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Start a new discussion to get the conversation going!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {discussions.map(discussion => (
            <div
              key={discussion._id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {discussion.isPinned && (
                          <PinIconSolid className="h-5 w-5 text-blue-600" />
                        )}
                        {discussion.isLocked && (
                          <LockClosedIcon className="h-5 w-5 text-gray-500" />
                        )}
                        <a
                          href={`/discussions/${discussion._id}`}
                          className="text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {discussion.title}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{discussion.author.name}</span>
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
                    {(user.role === 'ADMIN' || user.role === 'FACULTY') && (
                      <button
                        onClick={() => handleTogglePin(discussion._id)}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        {discussion.isPinned ? (
                          <PinIconSolid className="h-5 w-5" />
                        ) : (
                          <PinIcon className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                    {discussion.content}
                  </p>

                  {discussion.tags && discussion.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {discussion.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => handleToggleLike(discussion._id)}
                      className="flex items-center gap-1 hover:text-red-600"
                    >
                      {discussion.likes?.includes(user.id) ? (
                        <HeartIconSolid className="h-5 w-5 text-red-600" />
                      ) : (
                        <HeartIcon className="h-5 w-5" />
                      )}
                      {discussion.likes?.length || 0}
                    </button>
                    <div className="flex items-center gap-1">
                      <ChatBubbleLeftIcon className="h-5 w-5" />
                      {discussion.replies?.length || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <EyeIcon className="h-5 w-5" />
                      {discussion.views || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages} · {totalDiscussions} discussions
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
