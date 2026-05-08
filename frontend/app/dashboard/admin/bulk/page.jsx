'use client';
import { useState } from 'react';
import { ArrowUpTrayIcon, ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import api from '../../../../lib/axios';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import { toast } from 'sonner';

export default function BulkOperations() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleImport = async (type, file) => {
    if (!file) return;
    
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await api.post('/admin/bulk/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${response.data.imported} ${type} imported successfully`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (type) => {
    setExporting(true);
    try {
      const response = await api.get(`/admin/bulk/export/${type}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`${type} exported successfully`);
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const operations = [
    { type: 'students', label: 'Students' },
    { type: 'faculty', label: 'Faculty' },
    { type: 'users', label: 'Users' },
    { type: 'marks', label: 'Marks' },
    { type: 'attendance', label: 'Attendance' }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Bulk Operations</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {operations.map(({ type, label }) => (
          <Card key={type} className="p-6">
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
                    onChange={(e) => handleImport(type, e.target.files[0])}
                    className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
              
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={exporting}
                  onClick={() => handleExport(type)}
                  className="w-full"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}