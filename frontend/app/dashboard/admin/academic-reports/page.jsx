'use client';
import { useState, useEffect } from 'react';
import { ChartBarIcon, DocumentArrowDownIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../../../lib/axios';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import { LoadingSpinner } from '../../../../components/ui/Loading';

export default function AcademicReports() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    semester: 'all',
    department: 'all',
    academicYear: '2024'
  });

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/reports/academic', { params: filters });
      setReports(response.data.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type) => {
    try {
      const response = await api.get(`/admin/reports/export/${type}`, {
        params: filters,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading reports..." />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Academic Reports</h1>
        <Button variant="secondary" onClick={() => exportReport('performance')}>
          <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <FunnelIcon className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={filters.semester}
            onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value }))}
            className="input"
          >
            <option value="all">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map(sem => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
          
          <select
            value={filters.department}
            onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
            className="input"
          >
            <option value="all">All Departments</option>
            <option value="CSE">Computer Science</option>
            <option value="ECE">Electronics</option>
            <option value="ME">Mechanical</option>
          </select>
          
          <select
            value={filters.academicYear}
            onChange={(e) => setFilters(prev => ({ ...prev, academicYear: e.target.value }))}
            className="input"
          >
            <option value="2024">2024-25</option>
            <option value="2023">2023-24</option>
            <option value="2022">2022-23</option>
          </select>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 text-center">
          <h3 className="text-sm text-gray-600 mb-2">Total Students</h3>
          <p className="text-3xl font-bold text-blue-600">{reports?.summary?.totalStudents || 0}</p>
        </Card>
        <Card className="p-6 text-center">
          <h3 className="text-sm text-gray-600 mb-2">Pass Rate</h3>
          <p className="text-3xl font-bold text-green-600">{reports?.summary?.passRate || 0}%</p>
        </Card>
        <Card className="p-6 text-center">
          <h3 className="text-sm text-gray-600 mb-2">Average CGPA</h3>
          <p className="text-3xl font-bold text-purple-600">{reports?.summary?.averageCGPA || '0.0'}</p>
        </Card>
        <Card className="p-6 text-center">
          <h3 className="text-sm text-gray-600 mb-2">Distinction</h3>
          <p className="text-3xl font-bold text-yellow-600">{reports?.summary?.distinction || 0}%</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Semester-wise Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reports?.semesterPerformance || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="semester" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="averageMarks" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Department Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reports?.departmentComparison || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="averageCGPA" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}