'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ProtectedRoute from '@/components/ProtectedRoute';

const ENROLMENT_STATUS = {
  available: 'Available',
  enrolled: 'Enrolled',
  full: 'Full',
  prerequisite: 'Prerequisites Not Met',
};

function SeatBadge({ enrolled, max }) {
  const pct = max > 0 ? enrolled / max : 0;
  const color = pct >= 1 ? 'bg-red-100 text-red-700' : pct >= 0.8 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {enrolled}/{max} seats
    </span>
  );
}

export default function CourseRegistration() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState('register'); // 'register' | 'catalogue'
  const [availableCourses, setAvailableCourses] = useState([]);
  const [catalogCourses, setCatalogCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Catalogue search state
  const [search, setSearch] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const LIMIT = 12;

  useEffect(() => { fetchAvailableCourses(); }, []);

  useEffect(() => {
    if (tab === 'catalogue') fetchCatalogue();
  }, [tab, search, catalogPage]);

  const fetchAvailableCourses = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/courses/available');
      setAvailableCourses(data.data || []);
    } catch {
      toast.error('Failed to load available courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: catalogPage, limit: LIMIT });
      if (search) params.set('search', search);
      const { data } = await axios.get(`/courses/catalogue?${params}`);
      setCatalogCourses(data.data || []);
      setCatalogTotal(data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load catalogue');
    } finally {
      setLoading(false);
    }
  }, [search, catalogPage]);

  const validate = () => {
    if (selectedCourses.length === 0) {
      setErrors({ courses: 'Please select at least one course' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post('/courses/register', { courseIds: selectedCourses });
      toast.success(`${data.data.registeredCourses} course(s) registered successfully!`);
      // Redirect to first enrolled course detail
      if (selectedCourses.length === 1) {
        router.push(`/courses/${selectedCourses[0]}`);
      } else {
        router.push('/dashboard/student');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrop = async (courseId) => {
    if (!confirm('Drop this course?')) return;
    try {
      await axios.delete(`/courses/${courseId}/drop`);
      toast.success('Course dropped');
      fetchAvailableCourses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to drop course');
    }
  };

  const toggleSelect = (id) => {
    setErrors({});
    setSelectedCourses(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getStatus = (course) => {
    if (course.enrolledCount >= course.maxSeats) return 'full';
    return 'available';
  };

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Course Registration</h1>
          {user && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Semester {user.semester} · {user.department?.name || 'N/A'}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {['register', 'catalogue'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {t === 'register' ? 'My Registration' : 'Course Catalogue'}
            </button>
          ))}
        </div>

        {/* Registration Tab */}
        {tab === 'register' && (
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Available Courses</h2>
              {selectedCourses.length > 0 && (
                <span className="text-sm text-blue-600">{selectedCourses.length} selected</span>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              </div>
            ) : availableCourses.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No courses available for registration.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableCourses.map(course => {
                  const status = getStatus(course);
                  const isSelected = selectedCourses.includes(course._id);
                  const isFull = status === 'full';
                  return (
                    <label
                      key={course._id}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        isFull
                          ? 'border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isFull}
                        checked={isSelected}
                        onChange={() => toggleSelect(course._id)}
                        className="mt-1 w-4 h-4 accent-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white truncate">{course.name}</span>
                          <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                            {course.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{course.credits} credits</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Sem {course.semester}</span>
                          <SeatBadge enrolled={course.enrolledCount} max={course.maxSeats} />
                        </div>
                        <span className={`text-xs mt-1 inline-block font-medium ${
                          isFull ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {ENROLMENT_STATUS[status]}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {errors.courses && (
              <p className="mt-3 text-sm text-red-600">{errors.courses}</p>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleRegister}
                disabled={submitting || selectedCourses.length === 0}
              >
                {submitting ? 'Registering...' : `Register ${selectedCourses.length > 0 ? `(${selectedCourses.length})` : ''}`}
              </Button>
            </div>
          </Card>
        )}

        {/* Catalogue Tab */}
        {tab === 'catalogue' && (
          <Card className="p-6">
            <div className="mb-4 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, code, or description..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCatalogPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              </div>
            ) : catalogCourses.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No courses found.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catalogCourses.map(course => (
                    <div
                      key={course._id}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{course.name}</p>
                          <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{course.code}</p>
                        </div>
                        <SeatBadge enrolled={course.enrolledCount} max={course.maxSeats} />
                      </div>
                      {course.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{course.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{course.credits} credits</span>
                        <span>·</span>
                        <span>Sem {course.semester}</span>
                        <span>·</span>
                        <span>{course.department?.name}</span>
                      </div>
                      {course.prerequisites?.length > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Prereqs: {course.prerequisites.map(p => p.code).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {catalogTotal > LIMIT && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {(catalogPage - 1) * LIMIT + 1}–{Math.min(catalogPage * LIMIT, catalogTotal)} of {catalogTotal}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setCatalogPage(p => Math.max(1, p - 1))}
                        disabled={catalogPage === 1}
                        className="text-sm px-3 py-1"
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={() => setCatalogPage(p => p + 1)}
                        disabled={catalogPage * LIMIT >= catalogTotal}
                        className="text-sm px-3 py-1"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
