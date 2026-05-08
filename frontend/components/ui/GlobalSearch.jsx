'use client';
import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { MagnifyingGlassIcon, UserIcon, BookOpenIcon, ClipboardDocumentListIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Modal from './Modal';
import api from '../../lib/axios';

const GlobalSearch = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const getIcon = (type) => {
    switch (type) {
      case 'student': return UserIcon;
      case 'faculty': return UserIcon;
      case 'company': return BuildingOfficeIcon;
      case 'homework': return ClipboardDocumentListIcon;
      case 'book': return BookOpenIcon;
      case 'notice': return ClipboardDocumentListIcon;
      default: return ClipboardDocumentListIcon;
    }
  };

  const getRoute = (item) => {
    switch (item.type) {
      case 'student': return `/students/${item.id}`;
      case 'faculty': return `/faculty/${item.id}`;
      case 'homework': return `/homework/${item.id}`;
      case 'book': return `/library/books/${item.id}`;
      case 'notice': return `/notices/${item.id}`;
      default: return '#';
    }
  };

  const searchData = async (query) => {
    if (!query.trim() || !user) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/search?q=${encodeURIComponent(query)}&role=${user.role}`);
      setResults(response.data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        searchData(search);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, user]);

  const handleSelect = (item) => {
    const route = getRoute(item);
    if (route !== '#') {
      router.push(route);
    }
    onClose();
    setSearch('');
    setResults([]);
  };

  const getPlaceholder = () => {
    switch (user?.role) {
      case 'ADMIN': return 'Search students, faculty, companies...';
      case 'FACULTY': return 'Search students, homework...';
      case 'STUDENT': return 'Search books, homework, notices...';
      default: return 'Search...';
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" showCloseButton={false}>
      <Command className="rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-3">
          <MagnifyingGlassIcon className="mr-2 h-4 w-4 shrink-0 text-gray-500" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder={getPlaceholder()}
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Command.List className="max-h-[400px] overflow-y-auto">
          {loading && (
            <div className="p-3 text-sm text-gray-500 text-center">
              Searching...
            </div>
          )}
          
          {!loading && search && results.length === 0 && (
            <Command.Empty className="p-3 text-sm text-gray-500 text-center">
              No results found for "{search}"
            </Command.Empty>
          )}
          
          {!loading && results.map((item) => {
            const Icon = getIcon(item.type);
            return (
              <Command.Item
                key={`${item.type}-${item.id}`}
                onSelect={() => handleSelect(item)}
                className="flex items-start gap-3 px-3 py-3 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-100 last:border-b-0"
              >
                <Icon className="h-4 w-4 mt-0.5 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {item.title}
                  </div>
                  {item.content && (
                    <div className="text-gray-500 text-xs mt-1 line-clamp-2">
                      {item.content}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
                      {item.type}
                    </span>
                    {item.department && (
                      <span className="text-xs text-gray-400">
                        {item.department}
                      </span>
                    )}
                  </div>
                </div>
              </Command.Item>
            );
          })}
          
          {!search && (
            <div className="p-4 text-center">
              <div className="text-sm text-gray-500 mb-2">
                {user?.role === 'ADMIN' && 'Search for students, faculty, or companies'}
                {user?.role === 'FACULTY' && 'Search for students or homework'}
                {user?.role === 'STUDENT' && 'Search for books, homework, or notices'}
              </div>
              <div className="text-xs text-gray-400">
                Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+K</kbd> to close
              </div>
            </div>
          )}
        </Command.List>
      </Command>
    </Modal>
  );
};

export default GlobalSearch;