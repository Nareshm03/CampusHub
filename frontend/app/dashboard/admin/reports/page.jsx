'use client';
import Link from 'next/link';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { ChartBarIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

export default function ReportsPage() {
  const reports = [
    {
      title: 'Attendance Report',
      description: 'View student attendance statistics and identify low attendance',
      href: '/dashboard/admin/reports/attendance',
      icon: ChartBarIcon,
      color: 'text-blue-600'
    },
    {
      title: 'Marks Report',
      description: 'View student marks and identify students with low performance',
      href: '/dashboard/admin/reports/marks',
      icon: AcademicCapIcon,
      color: 'text-green-600'
    }
  ];

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Reports</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <Card key={report.title} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <report.icon className={`w-8 h-8 ${report.color}`} />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {report.title}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {report.description}
              </p>
              <Link href={report.href}>
                <Button>View Report</Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}