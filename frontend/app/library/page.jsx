'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import axios from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Input from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Search, AlertCircle, CheckCircle, Plus, Library } from 'lucide-react';

export default function LibraryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [myBooks, setMyBooks] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  // Issue form state
  const [issueForm, setIssueForm] = useState({ bookId: '', studentId: '', dueDate: '' });
  const [issueMsg, setIssueMsg] = useState(null);

  // Add book form state
  const [addForm, setAddForm] = useState({ title: '', author: '', isbn: '', category: '', totalCopies: 1 });
  const [addMsg, setAddMsg] = useState(null);

  useEffect(() => {
    fetchMyBooks();
    fetchCatalog();
    if (isAdmin) fetchIssuedBooks();
  }, []);

  const fetchMyBooks = async () => {
    try {
      const res = await axios.get('/library/my-books');
      setMyBooks(res.data.data);
    } catch {
      setMyBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async (q = '', cat = '') => {
    try {
      const params = {};
      if (q) params.search = q;
      if (cat) params.category = cat;
      const res = await axios.get('/library/books', { params });
      setCatalog(res.data.data.books);
    } catch {
      setCatalog([]);
    }
  };

  const fetchIssuedBooks = async () => {
    try {
      const res = await axios.get('/library/issued');
      setIssuedBooks(res.data.data);
    } catch {
      setIssuedBooks([]);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCatalog(search, category);
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    setIssueMsg(null);
    try {
      await axios.post('/library/issue', issueForm);
      setIssueMsg({ type: 'success', text: 'Book issued successfully' });
      setIssueForm({ bookId: '', studentId: '', dueDate: '' });
      fetchIssuedBooks();
      fetchCatalog();
    } catch (err) {
      setIssueMsg({ type: 'error', text: err.response?.data?.error || 'Failed to issue book' });
    }
  };

  const handleReturn = async (transactionId) => {
    try {
      const res = await axios.post(`/library/return/${transactionId}`);
      const fine = res.data.fine;
      alert(fine > 0 ? `Book returned. Fine: ₹${fine}` : 'Book returned successfully');
      fetchIssuedBooks();
      fetchCatalog();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to return book');
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    setAddMsg(null);
    try {
      await axios.post('/library/books', addForm);
      setAddMsg({ type: 'success', text: 'Book added to catalog' });
      setAddForm({ title: '', author: '', isbn: '', category: '', totalCopies: 1 });
      fetchCatalog();
    } catch (err) {
      setAddMsg({ type: 'error', text: err.response?.data?.error || 'Failed to add book' });
    }
  };

  const getDaysInfo = (dueDate) => {
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" /></div>;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Library</h1>
          <p className="text-gray-600 mt-1">Physical &amp; Digital resources</p>
        </div>
        <Link href="/library/books">
          <Button variant="outline">
            <BookOpen className="mr-2" size={16} />
            Digital Library
          </Button>
        </Link>
      </div>

      <Tabs defaultValue={isAdmin ? 'admin' : 'my-books'}>
        <TabsList>
          {!isAdmin && <TabsTrigger value="my-books">My Issued Books</TabsTrigger>}
          <TabsTrigger value="catalog">Book Catalog</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Manage Issuance</TabsTrigger>}
          {isAdmin && <TabsTrigger value="add-book">Add Book</TabsTrigger>}
        </TabsList>

        {/* My Books Tab */}
        {!isAdmin && (
          <TabsContent value="my-books">
            {myBooks.length === 0 ? (
              <Card><CardContent className="text-center py-12 text-gray-500">No books currently issued</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myBooks.map((book, idx) => {
                  const days = getDaysInfo(book.transaction.dueDate);
                  const overdue = days < 0;
                  return (
                    <Card key={idx} className={overdue ? 'border-red-400' : ''}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{book.title}</CardTitle>
                        <p className="text-sm text-gray-500">by {book.author}</p>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        {book.isbn && <p className="text-gray-500">ISBN: {book.isbn}</p>}
                        <p>Issued: {new Date(book.transaction.issueDate).toLocaleDateString()}</p>
                        <p className={overdue ? 'text-red-600 font-semibold' : 'text-green-700'}>
                          Due: {new Date(book.transaction.dueDate).toLocaleDateString()}
                          {overdue
                            ? ` — ${Math.abs(days)} days overdue`
                            : ` — ${days} days remaining`}
                        </p>
                        {overdue && (
                          <Badge variant="destructive">Fine: ₹{Math.abs(days) * 5}</Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}

        {/* Catalog Tab */}
        <TabsContent value="catalog">
          <Card className="mb-4">
            <CardContent className="pt-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Search by title, author, ISBN..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Categories</option>
                  {['General', 'Textbook', 'Reference', 'Journal', 'Fiction', 'Science', 'Engineering'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Button type="submit">Search</Button>
              </form>
            </CardContent>
          </Card>

          {catalog.length === 0 ? (
            <Card><CardContent className="text-center py-12 text-gray-500">No books found</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalog.map((item) => (
                <Card key={item._id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{item.book.title}</CardTitle>
                    <p className="text-sm text-gray-500">by {item.book.author}</p>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {item.book.isbn && <p className="text-gray-500">ISBN: {item.book.isbn}</p>}
                    {item.book.category && <Badge variant="secondary">{item.book.category}</Badge>}
                    <p className={item.book.availableCopies > 0 ? 'text-green-600' : 'text-red-500'}>
                      {item.book.availableCopies > 0
                        ? `${item.book.availableCopies} / ${item.book.totalCopies} available`
                        : 'Not available'}
                    </p>
                    {item.book.description && (
                      <p className="text-gray-600 line-clamp-2">{item.book.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Admin: Manage Issuance */}
        {isAdmin && (
          <TabsContent value="admin" className="space-y-6">
            {/* Issue Form */}
            <Card>
              <CardHeader><CardTitle>Issue Book</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleIssue} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="Book ID"
                    value={issueForm.bookId}
                    onChange={e => setIssueForm({ ...issueForm, bookId: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Student ID"
                    value={issueForm.studentId}
                    onChange={e => setIssueForm({ ...issueForm, studentId: e.target.value })}
                    required
                  />
                  <Input
                    type="date"
                    value={issueForm.dueDate}
                    onChange={e => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                    required
                  />
                  <div className="md:col-span-3">
                    <Button type="submit">Issue Book</Button>
                  </div>
                </form>
                {issueMsg && (
                  <div className={`mt-3 flex items-center gap-2 text-sm ${issueMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {issueMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {issueMsg.text}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Issued Books Table */}
            <Card>
              <CardHeader><CardTitle>Currently Issued Books</CardTitle></CardHeader>
              <CardContent>
                {issuedBooks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No books currently issued</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-600">
                          <th className="pb-2 pr-4">Book</th>
                          <th className="pb-2 pr-4">Student</th>
                          <th className="pb-2 pr-4">Issue Date</th>
                          <th className="pb-2 pr-4">Due Date</th>
                          <th className="pb-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issuedBooks.map((item, idx) => {
                          const days = getDaysInfo(item.transaction.dueDate);
                          const overdue = days < 0;
                          return (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium">{item.bookTitle}</td>
                              <td className="py-2 pr-4">
                                {item.transaction.student?.name || item.transaction.student}
                                {item.transaction.student?.rollNumber && (
                                  <span className="text-gray-500 ml-1">({item.transaction.student.rollNumber})</span>
                                )}
                              </td>
                              <td className="py-2 pr-4">{new Date(item.transaction.issueDate).toLocaleDateString()}</td>
                              <td className={`py-2 pr-4 ${overdue ? 'text-red-600 font-semibold' : ''}`}>
                                {new Date(item.transaction.dueDate).toLocaleDateString()}
                                {overdue && <span className="ml-1 text-xs">({Math.abs(days)}d overdue)</span>}
                              </td>
                              <td className="py-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReturn(item.transaction._id)}
                                >
                                  Return
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Admin: Add Book */}
        {isAdmin && (
          <TabsContent value="add-book">
            <Card className="max-w-lg">
              <CardHeader><CardTitle>Add Book to Catalog</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddBook} className="space-y-3">
                  <Input
                    placeholder="Title *"
                    value={addForm.title}
                    onChange={e => setAddForm({ ...addForm, title: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Author *"
                    value={addForm.author}
                    onChange={e => setAddForm({ ...addForm, author: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="ISBN"
                    value={addForm.isbn}
                    onChange={e => setAddForm({ ...addForm, isbn: e.target.value })}
                  />
                  <select
                    value={addForm.category}
                    onChange={e => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select Category</option>
                    {['General', 'Textbook', 'Reference', 'Journal', 'Fiction', 'Science', 'Engineering'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    placeholder="Total Copies"
                    min={1}
                    value={addForm.totalCopies}
                    onChange={e => setAddForm({ ...addForm, totalCopies: parseInt(e.target.value) })}
                  />
                  <Button type="submit">
                    <Plus size={16} className="mr-2" />
                    Add Book
                  </Button>
                </form>
                {addMsg && (
                  <div className={`mt-3 flex items-center gap-2 text-sm ${addMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {addMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {addMsg.text}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
