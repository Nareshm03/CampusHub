'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from '@/lib/axios';
import Link from 'next/link';

import { Book, Search, Filter, Download, Eye, Star, BookOpen, TrendingUp, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DigitalLibraryPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [popularBooks, setPopularBooks] = useState([]);
  const [readingList, setReadingList] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    department: '',
    semester: ''
  });
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchBooks();
    fetchPopularBooks();
    fetchReadingList();
    fetchStatistics();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchQuery || undefined,
        category: filters.category || undefined,
        department: filters.department || undefined,
        semester: filters.semester || undefined
      };

      const response = await axios.get('/digital-library/books', { params });
      setBooks(response.data.data.books);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPopularBooks = async () => {
    try {
      const response = await axios.get('/digital-library/books/popular');
      setPopularBooks(response.data.data);
    } catch (error) {
      console.error('Error fetching popular books:', error);
    }
  };

  const fetchReadingList = async () => {
    try {
      const response = await axios.get('/digital-library/my-reading-list');
      setReadingList(response.data.data);
    } catch (error) {
      console.error('Error fetching reading list:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/digital-library/statistics');
      setStatistics(response.data.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBooks();
  };

  const BookCard = ({ book, showProgress = false }) => {
    const progress = book.progress || null;

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex gap-3">
            {book.coverImage ? (
              <img 
                src={book.coverImage} 
                alt={book.title}
                className="w-20 h-28 object-cover rounded shadow"
              />
            ) : (
              <div className="w-20 h-28 bg-gradient-to-br from-blue-500 to-purple-600 rounded shadow flex items-center justify-center">
                <Book className="text-white" size={32} />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <Link href={`/library/books/${book._id}`}>
                <CardTitle className="text-base mb-1 hover:text-blue-600 line-clamp-2">
                  {book.title}
                </CardTitle>
              </Link>
              <CardDescription className="text-sm">{book.author}</CardDescription>
              
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {book.category}
                </Badge>
                {book.fileType && (
                  <Badge variant="outline" className="text-xs">
                    {book.fileType}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {showProgress && progress && (
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">{progress.percentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Page {progress.currentPage} of {progress.totalPages}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye size={14} />
                {book.views || 0}
              </span>
              <span className="flex items-center gap-1">
                <Download size={14} />
                {book.downloads || 0}
              </span>
              {book.averageRating > 0 && (
                <span className="flex items-center gap-1">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  {book.averageRating.toFixed(1)}
                </span>
              )}
            </div>
            
            <Link href={`/library/books/${book._id}`}>
              <Button size="sm" variant="outline">
                {showProgress && progress ? 'Continue' : 'Read'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/library" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft size={14} /> Back to Library
          </Link>
          <h1 className="text-3xl font-bold mb-2">Digital Library</h1>
          <p className="text-gray-600">Access e-books, journals, and research materials</p>
        </div>
        
        {(user?.role === 'faculty' || user?.role === 'admin') && (
          <Link href="/library/upload">
            <Button>
              <Book className="mr-2" size={18} />
              Upload Book
            </Button>
          </Link>
        )}
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Books</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalBooks}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Readers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalReaders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Currently Reading</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{readingList.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Popular This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{popularBooks.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Search books by title, author, ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="border rounded-md px-3 py-2"
              >
                <option value="">All Categories</option>
                <option value="Textbook">Textbook</option>
                <option value="Reference">Reference</option>
                <option value="Journal">Journal</option>
                <option value="Magazine">Magazine</option>
                <option value="Research Paper">Research Paper</option>
                <option value="eBook">eBook</option>
              </select>
              
              <select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                className="border rounded-md px-3 py-2"
              >
                <option value="">All Departments</option>
                {/* Add department options dynamically */}
              </select>
              
              <select
                value={filters.semester}
                onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                className="border rounded-md px-3 py-2"
              >
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Books</TabsTrigger>
          <TabsTrigger value="reading">Continue Reading</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : books.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Book className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-600">No books found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map(book => (
                <BookCard key={book._id} book={book} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reading">
          {readingList.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-600">No books in your reading list</p>
                <p className="text-sm text-gray-500 mt-2">Start reading a book to see it here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {readingList.map(book => (
                <BookCard key={book._id} book={book} showProgress={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="popular">
          {popularBooks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <TrendingUp className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-600">No popular books yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularBooks.map(book => (
                <BookCard key={book._id} book={book} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
