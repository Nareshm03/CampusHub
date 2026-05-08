'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { ArrowDownTrayIcon, AcademicCapIcon, ClipboardDocumentListIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { BarChart, ProgressRing } from '@/components/Charts';

export default function StudentReports() {
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [cgpa, setCgpa] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const studentRes = await api.get('/students/me');
      const s = studentRes.data?.data;
      setStudent(s);
      if (!s?._id) return;

      const [attRes, marksRes, cgpaRes] = await Promise.allSettled([
        api.get(`/attendance/summary/${s._id}`),
        api.get('/marks/my'),
        api.get('/grades/calculate/me'),
      ]);

      if (attRes.status === 'fulfilled') setAttendance(attRes.value.data?.data || []);
      if (marksRes.status === 'fulfilled') setMarks(marksRes.value.data?.data || []);
      if (cgpaRes.status === 'fulfilled') setCgpa(cgpaRes.value.data?.data?.cgpa ?? null);
    } catch {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const rows = [];
    rows.push(['ACADEMIC REPORT']);
    rows.push(['Student', student?.userId?.name || '', 'USN', student?.usn || '', 'Semester', student?.semester || '']);
    rows.push(['Department', student?.department?.name || '']);
    rows.push([]);

    rows.push(['--- ATTENDANCE ---']);
    rows.push(['Subject', 'Present', 'Total', 'Percentage']);
    attendance.forEach(a => {
      rows.push([a.subject?.name || '', a.presentClasses, a.totalClasses, `${a.percentage}%`]);
    });
    rows.push([]);

    rows.push(['--- MARKS ---']);
    rows.push(['Subject', 'Internal 1', 'Internal 2', 'Internal 3', 'Average', 'External', 'Status']);
    marks.forEach(m => {
      rows.push([
        m.subject?.name || '',
        m.internal1 || 0, m.internal2 || 0, m.internal3 || 0,
        m.average || 0,
        m.external || 0,
        m.status || ''
      ]);
    });
    if (cgpa !== null) {
      rows.push([]);
      rows.push(['CGPA', cgpa]);
    }

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic_report_${student?.usn || 'student'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const overallAttendance = attendance.length > 0
    ? Math.round(attendance.reduce((s, a) => s + a.percentage, 0) / attendance.length)
    : null;

  const attColor = overallAttendance >= 75 ? '#10b981' : overallAttendance >= 60 ? '#eab308' : '#ef4444';

  if (loading) return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />)}
        </div>
      </div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="container max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ChartBarIcon className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Academic Report</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                {student?.userId?.name} · {student?.usn} · Sem {student?.semester} · {student?.department?.name}
              </p>
            </div>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[110px]">
            {overallAttendance !== null ? (
              <ProgressRing percentage={overallAttendance} size={70} strokeWidth={7} color={attColor} />
            ) : (
              <p className="text-2xl font-bold text-gray-400">N/A</p>
            )}
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2">Overall Attendance</p>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[110px]">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{cgpa ?? '--'}</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2">CGPA</p>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[110px]">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{marks.length}</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2">Subjects (Marks)</p>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[110px]">
            <p className={`text-3xl font-bold ${attendance.filter(a => a.percentage < 75).length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {attendance.filter(a => a.percentage < 75).length}
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2">Low Attendance</p>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card className="mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <ClipboardDocumentListIcon className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance by Subject</h2>
          </div>
          {attendance.length === 0 ? (
            <p className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No attendance records found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {['Subject', 'Present', 'Total Classes', 'Percentage', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {attendance.map((a, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.subject?.name || 'Subject'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.presentClasses}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.totalClasses}</td>
                        <td className={`px-4 py-3 font-semibold ${a.percentage >= 75 ? 'text-green-600' : a.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {a.percentage}%
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={a.percentage >= 75 ? 'success' : a.percentage >= 60 ? 'warning' : 'danger'}>
                            {a.percentage >= 75 ? 'Good' : a.percentage >= 60 ? 'Warning' : 'Low'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {attendance.length > 0 && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                  <BarChart
                    data={attendance.map(a => ({ label: (a.subject?.name || 'Sub').slice(0, 10), value: a.percentage }))}
                    height={180} color="#10b981"
                  />
                </div>
              )}
            </>
          )}
        </Card>

        {/* Marks Table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <AcademicCapIcon className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Internal Marks</h2>
          </div>
          {marks.length === 0 ? (
            <p className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No marks records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {['Subject', 'Int 1', 'Int 2', 'Int 3', 'Average', 'External', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {marks.map((m, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        <div>{m.subject?.name || 'Subject'}</div>
                        <div className="text-xs text-gray-400">{m.subject?.subjectCode}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{m.internal1 || 0}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{m.internal2 || 0}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{m.internal3 || 0}</td>
                      <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">{m.average}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{m.external || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={m.status === 'SAFE' ? 'success' : 'danger'}>{m.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </ProtectedRoute>
  );
}
