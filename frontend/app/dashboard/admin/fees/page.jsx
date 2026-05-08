'use client';
import { useState } from 'react';
import api from '../../../../lib/axios';
import Card from '../../../../components/ui/Card';
import { toast } from 'sonner';

export default function AdminFeesPage() {
  const [formData, setFormData] = useState({
    student: '',
    semester: 1,
    academicYear: '2023-2024',
    tuitionFee: 0,
    examFee: 0,
    libraryFee: 0,
    dueDate: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const payload = {
        student: formData.student, // ID of the student
        semester: Number(formData.semester),
        academicYear: formData.academicYear,
        tuitionFee: Number(formData.tuitionFee),
        examFee: Number(formData.examFee),
        libraryFee: Number(formData.libraryFee),
        dueDate: formData.dueDate,
        status: 'PENDING'
      };

      const res = await api.post('/fees', payload);
      if (res.data?.success) {
        toast.success('Fee invoice generated successfully!');
        setFormData({ ...formData, student: '', tuitionFee: 0, examFee: 0, libraryFee: 0, dueDate: '' });
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to issue fee.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Issue Fees</h1>
        <p className="text-gray-500">Generate a new financial invoice for a student.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student ID (Mongo DB _id)</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                value={formData.student}
                onChange={e => setFormData({...formData, student: e.target.value})}
                placeholder="65a7f..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Academic Year</label>
              <select 
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                value={formData.academicYear}
                onChange={e => setFormData({...formData, academicYear: e.target.value})}
              >
                <option value="2023-2024">2023-2024</option>
                <option value="2024-2025">2024-2025</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
              <input
                type="number"
                min="1" max="8"
                required
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                value={formData.semester}
                onChange={e => setFormData({...formData, semester: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                value={formData.dueDate}
                onChange={e => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>
          </div>

          <div className="border-t dark:border-gray-700 pt-4 mt-6">
            <h3 className="font-semibold mb-3">Itemized Charges</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400">Tuition Fee ($)</label>
                <input
                  type="number"
                  required
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  value={formData.tuitionFee}
                  onChange={e => setFormData({...formData, tuitionFee: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400">Exam Fee ($)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  value={formData.examFee}
                  onChange={e => setFormData({...formData, examFee: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400">Library Fee ($)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  value={formData.libraryFee}
                  onChange={e => setFormData({...formData, libraryFee: e.target.value})}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Issuing Invoice...' : 'Generate Fee Invoice'}
          </button>
        </form>
      </Card>
    </div>
  );
}
