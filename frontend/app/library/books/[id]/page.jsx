'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import axios from '@/lib/axios';
import { PDFReader, EPUBReader, BookmarkPanel, AnnotationPanel, ReadingProgress } from '@/components/EBookReader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Download, BookOpen, Bookmark, MessageSquare, Info, Star as StarIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReader, setShowReader] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const progressUpdateTimer = useRef(null);

  useEffect(() => {
    if (params.id) {
      fetchBookDetails();
    }
  }, [params.id]);

  const fetchBookDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/digital-library/books/${params.id}`);
      setBook(response.data.data.book);
      setUserProgress(response.data.data.userProgress);
      setBookmarks(response.data.data.userBookmarks || []);
      setAnnotations(response.data.data.userAnnotations || []);
    } catch (error) {
      console.error('Error fetching book:', error);
      toast.error('Failed to load book details');
      router.push('/library/books');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = async (currentPage) => {
    // Debounce progress updates
    if (progressUpdateTimer.current) {
      clearTimeout(progressUpdateTimer.current);
    }

    progressUpdateTimer.current = setTimeout(async () => {
      try {
        const response = await axios.put(`/digital-library/books/${params.id}/progress`, {
          currentPage,
          timeSpent: 1 // 1 minute increment
        });
        setUserProgress(response.data.data);
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    }, 3000); // Update after 3 seconds of no page changes
  };

  const handleAddBookmark = async (page, note = '') => {
    try {
      const response = await axios.post(`/digital-library/books/${params.id}/bookmarks`, {
        page,
        note
      });
      setBookmarks([...bookmarks, response.data.data]);
      toast.success('Bookmark added');
    } catch (error) {
      console.error('Error adding bookmark:', error);
      toast.error('Failed to add bookmark');
    }
  };

  const handleDeleteBookmark = async (bookmarkId) => {
    try {
      await axios.delete(`/digital-library/books/${params.id}/bookmarks/${bookmarkId}`);
      setBookmarks(bookmarks.filter(b => b._id !== bookmarkId));
      toast.success('Bookmark deleted');
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      toast.error('Failed to delete bookmark');
    }
  };

  const handleAddAnnotation = async (annotationData) => {
    try {
      const response = await axios.post(`/digital-library/books/${params.id}/annotations`, annotationData);
      setAnnotations([...annotations, response.data.data]);
      toast.success('Annotation added');
    } catch (error) {
      console.error('Error adding annotation:', error);
      toast.error('Failed to add annotation');
    }
  };

  const handleDeleteAnnotation = async (annotationId) => {
    try {
      await axios.delete(`/digital-library/books/${params.id}/annotations/${annotationId}`);
      setAnnotations(annotations.filter(a => a._id !== annotationId));
      toast.success('Annotation deleted');
    } catch (error) {
      console.error('Error deleting annotation:', error);
      toast.error('Failed to delete annotation');
    }
  };

  const handleDownload = async () => {
    try {
      window.open(`${process.env.NEXT_PUBLIC_API_URL}/digital-library/books/${params.id}/download`, '_blank');
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading book:', error);
      toast.error('Failed to download book');
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/digital-library/books/${params.id}/rating`, {
        rating,
        review
      });
      toast.success('Rating submitted');
      fetchBookDetails();
      setRating(0);
      setReview('');
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!book) {
    return null;
  }

  if (showReader) {
    return book.fileType === 'PDF' ? (
      <PDFReader
        fileUrl={book.fileUrl}
        bookId={book._id}
        initialPage={userProgress?.currentPage || 1}
        totalPages={book.totalPages}
        onProgressUpdate={handleProgressUpdate}
      />
    ) : (
      <EPUBReader
        fileUrl={book.fileUrl}
        bookId={book._id}
        onProgressUpdate={handleProgressUpdate}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Book Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex gap-6">
            {/* Book Cover */}
            <div className="flex-shrink-0">
              {book.coverImage ? (
                <img 
                  src={book.coverImage} 
                  alt={book.title}
                  className="w-48 h-64 object-cover rounded-lg shadow-md"
                />
              ) : (
                <div className="w-48 h-64 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md flex items-center justify-center">
                  <BookOpen className="text-white" size={64} />
                </div>
              )}
            </div>

            {/* Book Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
                  <p className="text-xl text-gray-600 mb-2">by {book.author}</p>
                  
                  <div className="flex items-center gap-4 mb-4">
                    {book.averageRating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="fill-yellow-400 text-yellow-400" size={20} />
                        <span className="font-medium">{book.averageRating.toFixed(1)}</span>
                        <span className="text-gray-500 text-sm">({book.ratings.length} ratings)</span>
                      </div>
                    )}
                    
                    <Badge variant="secondary">{book.category}</Badge>
                    <Badge variant="outline">{book.fileType}</Badge>
                    {book.language && <Badge variant="outline">{book.language}</Badge>}
                  </div>
                </div>
              </div>

              {/* Description */}
              {book.description && (
                <p className="text-gray-700 mb-4">{book.description}</p>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                {book.publisher && (
                  <div>
                    <span className="text-gray-600">Publisher:</span>
                    <span className="ml-2 font-medium">{book.publisher}</span>
                  </div>
                )}
                {book.isbn && (
                  <div>
                    <span className="text-gray-600">ISBN:</span>
                    <span className="ml-2 font-medium">{book.isbn}</span>
                  </div>
                )}
                {book.edition && (
                  <div>
                    <span className="text-gray-600">Edition:</span>
                    <span className="ml-2 font-medium">{book.edition}</span>
                  </div>
                )}
                {book.totalPages && (
                  <div>
                    <span className="text-gray-600">Pages:</span>
                    <span className="ml-2 font-medium">{book.totalPages}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {book.tags && book.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {book.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={() => setShowReader(true)} size="lg">
                  <BookOpen className="mr-2" size={20} />
                  {userProgress ? 'Continue Reading' : 'Start Reading'}
                </Button>
                
                {book.allowDownload && (
                  <Button onClick={handleDownload} variant="outline" size="lg">
                    <Download className="mr-2" size={20} />
                    Download
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reading Progress */}
        {userProgress && (
          <div className="mb-6">
            <ReadingProgress
              current={userProgress.currentPage}
              total={userProgress.totalPages}
              percentage={userProgress.percentage}
              timeSpent={userProgress.timeSpent}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList>
            <TabsTrigger value="info">
              <Info className="mr-2" size={16} />
              Information
            </TabsTrigger>
            <TabsTrigger value="bookmarks">
              <Bookmark className="mr-2" size={16} />
              Bookmarks ({bookmarks.length})
            </TabsTrigger>
            <TabsTrigger value="annotations">
              <MessageSquare className="mr-2" size={16} />
              Annotations ({annotations.length})
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <StarIcon className="mr-2" size={16} />
              Reviews ({book.ratings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Book Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Details</h3>
                    <div className="space-y-2 text-sm">
                      {book.department && (
                        <div>
                          <span className="text-gray-600">Department:</span>
                          <span className="ml-2">{book.department.name}</span>
                        </div>
                      )}
                      {book.subject && (
                        <div>
                          <span className="text-gray-600">Subject:</span>
                          <span className="ml-2">{book.subject.name}</span>
                        </div>
                      )}
                      {book.semester && (
                        <div>
                          <span className="text-gray-600">Semester:</span>
                          <span className="ml-2">{book.semester}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Statistics</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Views:</span>
                        <span className="ml-2">{book.views}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Downloads:</span>
                        <span className="ml-2">{book.downloads}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Readers:</span>
                        <span className="ml-2">{book.readers.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookmarks">
            <BookmarkPanel
              bookmarks={bookmarks}
              onBookmarkClick={(page) => {
                setShowReader(true);
                // Navigate to page logic would go here
              }}
              onBookmarkDelete={handleDeleteBookmark}
            />
          </TabsContent>

          <TabsContent value="annotations">
            <AnnotationPanel
              annotations={annotations}
              onAnnotationClick={(page) => {
                setShowReader(true);
                // Navigate to page logic would go here
              }}
              onAnnotationDelete={handleDeleteAnnotation}
            />
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>Reviews & Ratings</CardTitle>
                <CardDescription>Share your thoughts about this book</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Rating Form */}
                <form onSubmit={handleSubmitRating} className="border-b pb-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Your Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="focus:outline-none"
                        >
                          <Star
                            size={32}
                            className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Review (Optional)</label>
                    <textarea
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      className="w-full border rounded-md p-3"
                      rows={4}
                      placeholder="Share your thoughts..."
                    />
                  </div>
                  
                  <Button type="submit" disabled={rating === 0}>
                    Submit Rating
                  </Button>
                </form>

                {/* Existing Reviews */}
                <div className="space-y-4">
                  {book.ratings.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No reviews yet. Be the first to review!</p>
                  ) : (
                    book.ratings.map((r, index) => (
                      <div key={index} className="border-b pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{r.user?.name || 'Anonymous'}</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={16}
                                  className={star <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {r.review && <p className="text-gray-700">{r.review}</p>}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
