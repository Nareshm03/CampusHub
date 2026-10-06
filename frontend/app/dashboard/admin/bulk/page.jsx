'use client';
import { useState } from 'react';
import { ArrowUpTrayIcon, ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import api from '../../../../lib/axios';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { toast } from 'sonner';

const TEMPLATES = {
  students: 'name,email,password,usn,department,semester,phone',
  faculty: 'name,email,password,department,employeeId,designation,qualification,experience,dateOfJoining',
  users: 'name,email,password,role,department,linkedStudentUsn',
  marks: 'usn,subjectCode,examType,examName,marks,maxMarks,grade',
  attendance: 'usn,subjectCode,date,status'
};

function downloadTemplate(type) {
  const blob = new Blob([TEMPLATES[type] + '\n'], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${type}_template.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function OperationCard({ type, label }) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async (file) => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await api.post('/admin/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = response.data?.data;
      setResult(data);
      toast.success(`${data.imported} ${label} imported (${data.skipped} skipped)`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get(`/admin/export/${type}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${label} exported successfully`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center mb-4">
        <DocumentTextIcon className="w-6 h-6 text-blue-600 mr-3" />
        <h3 className="text-lg font-semibold">{label}</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Import {label}</label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".csv"
              disabled={importing}
              onChange={(e) => { handleImport(e.target.files[0]); e.target.value = ''; }}
              className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <button
            onClick={() => downloadTemplate(type)}
            className="text-xs text-blue-600 hover:underline mt-1"
          >
            Download CSV template
          </button>
          {importing && <p className="text-sm text-gray-500 mt-2">Importing…</p>}
        </div>

        {result && (
          <div className="text-sm border rounded p-3 bg-gray-50 dark:bg-gray-800 space-y-1">
            <p><strong>Imported:</strong> {result.imported} (updated: {result.updated || 0})</p>
            <p><strong>Skipped:</strong> {result.skipped}</p>
            {result.errorCount > 0 && <p><strong>Errors:</strong> {result.errorCount}</p>}
            {(result.errors || []).length > 0 && (
              <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-red-700 dark:text-red-400 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i}>Row {e.row}: {e.error}</li>
                ))}
              </ul>
            )}
            {(result.credentials || []).length > 0 && (
              <div className="mt-2 text-xs">
                <p className="font-semibold text-amber-700 dark:text-amber-400">Generated passwords — save them now (shown once):</p>
                <ul className="mt-1 space-y-1 font-mono">
                  {result.credentials.map((c) => (
                    <li key={c.email}>{c.email} / {c.password}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div>
          <Button
            variant="secondary"
            size="sm"
            loading={exporting}
            onClick={handleExport}
            className="w-full"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function BulkOperations() {
  const operations = [
    { type: 'students', label: 'Students' },
    { type: 'faculty', label: 'Faculty' },
    { type: 'users', label: 'Users' },
    { type: 'marks', label: 'Marks' },
    { type: 'attendance', label: 'Attendance' }
  ];

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ArrowUpTrayIcon className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-semibold">Bulk Operations</h1>
            <p className="text-sm text-gray-500">Import validated CSV data or export real records. Invalid rows are skipped with row-level errors and never partially written.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {operations.map(({ type, label }) => (
            <OperationCard key={type} type={type} label={label} />
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}
