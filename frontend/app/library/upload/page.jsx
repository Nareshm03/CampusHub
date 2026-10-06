'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import axios from '@/lib/axios';
import { ArrowLeft, Upload, Book } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/card';

const CATEGORIES = ['Textbook', 'Reference', 'Journal', 'Magazine', 'Research Paper', 'eBook', 'Other'];
const ACCESS_TYPES = ['Students Only', 'Faculty Only', 'Public', 'Private'];
const ACCEPTED_EXTENSIONS = ['.pdf', '.epub', '.mobi', '.txt'];

export default function LibraryUploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: '',
    author: '',
    category: 'eBook',
    description: '',
    accessType: 'Students Only',
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedId, setUploadedId] = useState(null);

  const handleFileChange = (e) => {
    setError('');
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }
    const ext = '.' + (selected.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Invalid file type. Allowed: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      setFile(null);
      e.target.value = '';
      return;
    }
    if (selected.size > 100 * 1024 * 1024) {
      setError('File exceeds the 100MB limit');
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Please choose an e-book file to upload');
      return;
    }
    if (!form.title.trim() || !form.author.trim()) {
      setError('Title and author are required');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('book', file);
      formData.append('title', form.title.trim());
      formData.append('author', form.author.trim());
      formData.append('category', form.category);
      if (form.description.trim()) formData.append('description', form.description.trim());
      formData.append('accessType', form.accessType);

      // NOTE: no manual Content-Type — the browser sets the multipart boundary.
      const response = await axios.post('/digital-library/books', formData);
      setUploadedId(response.data?.data?._id || null);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/library/books" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={14} /> Back to Digital Library
        </Link>
        <h1 className="text-3xl font-bold mb-2">Upload E-Book</h1>
        <p className="text-gray-600 mb-6">
          Share learning material with students.
          {user?.role === 'ADMIN'
            ? ' Books you upload go live immediately.'
            : ' Your upload will be marked Pending Review until an admin approves it.'}
        </p>

        <Card className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
          {uploadedId ? (
            <div className="text-center py-6">
              <Book className="mx-auto mb-3 text-green-600" size={40} />
              <h2 className="text-xl font-semibold mb-2">Upload successful</h2>
              <p className="text-gray-600 text-sm mb-4">Your e-book has been added to the digital library.</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => router.push(`/library/books/${uploadedId}`)}>
                  View Book
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadedId(null);
                    setFile(null);
                    setForm({ title: '', author: '', category: 'eBook', description: '', accessType: 'Students Only' });
                  }}
                >
                  Upload Another
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">E-book file (PDF, EPUB, MOBI, TXT — max 100MB) *</label>
                <input
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {file && <p className="text-xs text-gray-500 mt-1">Selected: {file.name}</p>}
              </div>
              <Input
                label="Title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Introduction to Algorithms"
              />
              <Input
                label="Author *"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="e.g. Cormen et al."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Access</label>
                  <select
                    value={form.accessType}
                    onChange={(e) => setForm({ ...form, accessType: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {ACCESS_TYPES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Brief summary of the book"
                />
              </div>
              <Button type="submit" disabled={uploading} className="w-full">
                <Upload className="mr-2" size={16} />
                {uploading ? 'Uploading…' : 'Upload Book'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}
