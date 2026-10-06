'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from '@/lib/axios';
import { toast } from 'react-hot-toast';

export default function ExamRegisterPage() {
  const [exam, setExam] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    personalDetails: {
      name: '',
      usn: '',
      email: '',
      phone: '',
      address: ''
    },
    academicDetails: {
      department: '',
      semester: '',
      subjects: []
    }
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    fetchExam();
  }, []);

  const fetchExam = async () => {
    try {
      setFetchError('');
      const response = await axios.get(`/exams/available?examId=${params.id}`);
      const exams = response.data.exams || [];
      const examData = exams.find(e => e._id === params.id) || null;
      setExam(examData);
      if (!examData && !fetchError) {
        setFetchError(exams.length === 0 ? 'This exam is not available for registration.' : 'Exam not found.');
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
      const message = error.response?.data?.message || error.response?.data?.error || 'Failed to load exam details.';
      setFetchError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        examId: params.id,
        formData: {
          ...formData,
          academicDetails: {
            ...formData.academicDetails,
            semester: Number(formData.academicDetails.semester),
          },
        },
      };
      await axios.post('/exams/register', payload);
      toast.success('Registration successful!');
      router.push('/exams');
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Registration failed!';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/4"></div><div className="h-32 bg-gray-200 rounded"></div></div></div>;
  if (!exam) return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-700 font-medium">Exam not available</p>
        <p className="text-gray-500 text-sm mt-1">{fetchError || 'This exam is not open for registration.'}</p>
        <button onClick={() => router.push('/exams')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Back to Exams</button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Exam Registration</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="text-xl font-semibold">{exam.title}</h2>
        <p>Subject: {exam.subject?.name} {exam.subject?.subjectCode ? `(${exam.subject.subjectCode})` : ''}</p>
        <p>Date: {exam.examDate ? new Date(exam.examDate).toLocaleDateString() : '—'}</p>
        <p>Venue: {exam.venue}</p>
        <p>Fee: ₹{exam.fee}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Personal Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full Name"
              value={formData.personalDetails.name}
              onChange={(e) => handleInputChange('personalDetails', 'name', e.target.value)}
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              placeholder="USN"
              value={formData.personalDetails.usn}
              onChange={(e) => handleInputChange('personalDetails', 'usn', e.target.value)}
              className="border p-2 rounded"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.personalDetails.email}
              onChange={(e) => handleInputChange('personalDetails', 'email', e.target.value)}
              className="border p-2 rounded"
              required
            />
            <input
              type="tel"
              placeholder="Phone"
              value={formData.personalDetails.phone}
              onChange={(e) => handleInputChange('personalDetails', 'phone', e.target.value)}
              className="border p-2 rounded"
              required
            />
          </div>
          <textarea
            placeholder="Address"
            value={formData.personalDetails.address}
            onChange={(e) => handleInputChange('personalDetails', 'address', e.target.value)}
            className="border p-2 rounded w-full mt-4"
            rows="3"
            required
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Academic Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Department"
              value={formData.academicDetails.department}
              onChange={(e) => handleInputChange('academicDetails', 'department', e.target.value)}
              className="border p-2 rounded"
              required
            />
            <input
              type="number"
              placeholder="Semester"
              value={formData.academicDetails.semester}
              onChange={(e) => handleInputChange('academicDetails', 'semester', e.target.value)}
              className="border p-2 rounded"
              min="1"
              max="8"
              required
            />
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => router.push('/exams')}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Registering...' : 'Register'}
          </button>
        </div>
      </form>
    </div>
  );
}