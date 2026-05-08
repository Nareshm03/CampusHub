'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import axios from '@/lib/axios';
import { toast } from 'sonner';

export default function GradeCalculator() {
  const [grades, setGrades] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('');

  const calculateGrades = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/grades/calculate/me${selectedSemester ? `?semester=${selectedSemester}` : ''}`);
      setGrades(response.data.data);
    } catch (error) {
      console.error('Error calculating grades:', error);
      toast.error('Failed to calculate grades');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-6">
          <AcademicCapIcon className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold">My Academic Performance</h1>
        </div>
        
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Grade Calculator</h2>
          
          <div className="flex gap-4 mb-6">
            <select 
              value={selectedSemester} 
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800"
            >
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
            <Button onClick={calculateGrades} disabled={loading}>
              {loading ? 'Calculating...' : 'Calculate Grades'}
            </Button>
          </div>

          {grades && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-500">
                <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">CGPA: {grades.cgpa}</h3>
                <p className="text-gray-600 dark:text-gray-400">Total Credits: {grades.totalCredits}</p>
              </div>

              {Object.entries(grades.semesterGrades).map(([sem, data]) => (
                <Card key={sem} className="p-4">
                  <h4 className="font-semibold mb-3">Semester {sem} - GPA: {data.gpa}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {data.subjects.map((subject, idx) => (
                      <div key={idx} className="flex justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="font-medium">{subject.subject}</span>
                        <span className="text-blue-600 dark:text-blue-400">{subject.grade} ({subject.marks.toFixed(1)})</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!grades && !loading && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>Select a semester and click "Calculate Grades" to view your academic performance</p>
            </div>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}