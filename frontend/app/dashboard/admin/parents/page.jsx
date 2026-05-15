'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import api from '../../../../lib/axios';
import { toast } from 'sonner';
import { UserPlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchParents();
  }, []);

  const fetchParents = async () => {
    try {
      const response = await api.get('/parent/all');
      setParents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch parents:', error);
      toast.error('Failed to load parents');
    } finally {
      setLoading(false);
    }
  };

  const filteredParents = parents.filter(parent =>
    parent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.studentDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.studentDetails?.usn?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Parents</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage parent accounts and their linked students
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Total: <span className="font-bold">{parents.length}</span>
            </span>
          </div>
        </div>

        <Card className="mb-6">
          <div className="p-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by parent name, email, student name, or USN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        </Card>

        {filteredParents.length === 0 ? (
          <Card className="p-12 text-center">
            <UserPlusIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No parents found' : 'No parents registered'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search criteria' : 'Parent accounts will appear here once registered'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredParents.map((parent) => (
              <Card key={parent._id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {parent.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {parent.email}
                    </p>
                    {parent.phone && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        📞 {parent.phone}
                      </p>
                    )}
                  </div>
                </div>

                {parent.studentDetails ? (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Linked Student
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {parent.studentDetails.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {parent.studentDetails.usn}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {parent.studentDetails.department} • Sem {parent.studentDetails.semester}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      ⚠️ No student linked
                    </p>
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Joined: {new Date(parent.createdAt).toLocaleDateString()}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
