'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from '@/lib/axios';

export default function ExamRegisterPage() {
  const [exam, setExam] = useState(null);
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
      const response = await axios.get(`/api/exams/available?examId=${params.id}`);
      const examData = response.data.exams.find(e => e._id === params.id);
      setExam(examData);
    } catch (error) {
      console.error('Error fetching exam:', error);
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
      await axios.post('/api/exams/register', {
        examId: params.id,
        formData
      });
      alert('Registration successful!');
      router.push('/exams');
    } catch (error) {
      alert('Registration failed!');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!exam) return <div className="p-6">Exam not found</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Exam Registration</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="text-xl font-semibold">{exam.title}</h2>
        <p>Subject: {exam.subject?.name}</p>
        <p>Date: {new Date(exam.examDate).toLocaleDateString()}</p>
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
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Register
          </button>
        </div>
      </form>
    </div>
  );
}