'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../../../components/ProtectedRoute';
import Card from '../../../../../components/ui/Card';
import Button from '../../../../../components/ui/Button';
import { ArrowUpIcon, ArrowDownIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import api from '../../../../../lib/axios';

export default function MarksReport() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('studentName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 25;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = data.filter(item =>
      item.studentName.toLowerCase().includes(search.toLowerCase()) ||
      item.usn.toLowerCase().includes(search.toLowerCase()) ||
      item.subject.toLowerCase().includes(search.toLowerCase()) ||
      item.department.toLowerCase().includes(search.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (sortBy === 'percentage' || sortBy === 'obtainedMarks' || sortBy === 'totalMarks') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [data, search, sortBy, sortOrder]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.get('/reports/marks');
      setData(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch marks data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getStatusDisplay = (percentage) => {
    const isLow = percentage < 40;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
        isLow 
          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      }`}>
        {isLow ? 'Low Marks' : 'Pass'}
      </span>
    );
  };

  const exportToCSV = () => {
    const csvData = filteredData.map(item => ({
      'Student Name': item.studentName,
      'USN': item.usn,
      'Department': item.department,
      'Semester': item.semester,
      'Subject': item.subject,
      'Obtained Marks': item.obtainedMarks,
      'Total Marks': item.totalMarks,
      'Percentage': item.percentage.toFixed(2),
      'Grade': item.grade,
      'Status': item.status
    }));
    
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marks_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const subjectAverages = data.length ? 
    Object.entries(
      data.reduce((acc, item) => {
        if (!acc[item.subject]) acc[item.subject] = [];
        acc[item.subject].push(item.percentage);
        return acc;
      }, {})
    ).map(([subject, percentages]) => ({
      subject,
      average: (percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length).toFixed(2)
    })) : [];

  const paginatedData = filteredData.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">Marks Report</h1>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Marks Report</h1>
          <Button 
            onClick={exportToCSV} 
            disabled={filteredData.length === 0}
            className="flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Download CSV
          </Button>
        </div>

        {subjectAverages.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Subject-wise Average Percentage</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectAverages.map((item) => (
                <div key={item.subject} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white">{item.subject}</div>
                  <div className="text-2xl font-bold text-blue-600">{item.average}%</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6 mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name, USN, department, or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </Card>

        {error && (
          <Card className="p-6 mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <Button onClick={fetchData} variant="outline">Retry</Button>
            </div>
          </Card>
        )}

        {!error && filteredData.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {data.length === 0 ? 'No marks data available.' : 'No results found for your search.'}
            </p>
          </Card>
        )}

        {!error && filteredData.length > 0 && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {[
                      { key: 'studentName', label: 'Student Name' },
                      { key: 'usn', label: 'USN' },
                      { key: 'department', label: 'Department' },
                      { key: 'subject', label: 'Subject' },
                      { key: 'obtainedMarks', label: 'Obtained' },
                      { key: 'totalMarks', label: 'Total' },
                      { key: 'percentage', label: 'Percentage' },
                      { key: 'grade', label: 'Grade' },
                      { key: 'status', label: 'Status', sortable: false }
                    ].map((col) => (
                      <th
                        key={col.key}
                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                          col.sortable !== false ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''
                        }`}
                        onClick={() => col.sortable !== false && handleSort(col.key)}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {col.sortable !== false && sortBy === col.key && (
                            sortOrder === 'asc' ? 
                            <ArrowUpIcon className="h-4 w-4" /> : 
                            <ArrowDownIcon className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedData.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        item.percentage < 40 ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.studentName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-600 dark:text-gray-300">
                          {item.usn}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {item.department}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {item.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.obtainedMarks}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {item.totalMarks}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-semibold ${
                          item.percentage >= 90 ? 'text-green-600 dark:text-green-400' :
                          item.percentage >= 75 ? 'text-blue-600 dark:text-blue-400' :
                          item.percentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {item.percentage.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.grade === 'A+' || item.grade === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          item.grade === 'B+' || item.grade === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                          item.grade === 'C' || item.grade === 'D' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {item.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusDisplay(item.percentage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, filteredData.length)} of {filteredData.length} results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      Previous
                    </Button>
                    <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}