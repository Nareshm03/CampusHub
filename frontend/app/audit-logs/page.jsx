'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from '@/lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Input from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
  Activity,
  Shield,
  AlertTriangle,
  Clock,
  User,
  FileText,
  Download,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  TrendingUp
} from 'lucide-react';

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  
  // Filters
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    severity: '',
    startDate: '',
    endDate: '',
    suspicious: false,
    page: 1,
    limit: 50
  });

  useEffect(() => {
    fetchAuditLogs();
    if (user?.role === 'admin') {
      fetchStatistics();
      fetchSuspiciousActivities();
      fetchRecentActivity();
    }
  }, [filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`/audit-logs?${params.toString()}`);
      setLogs(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/audit-logs/statistics');
      setStatistics(response.data.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchSuspiciousActivities = async () => {
    try {
      const response = await axios.get('/audit-logs/suspicious');
      setSuspiciousActivities(response.data.data);
    } catch (error) {
      console.error('Error fetching suspicious activities:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await axios.get('/audit-logs/recent?limit=20');
      setRecentActivity(response.data.data);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const handleExport = async (format = 'json') => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'page' && key !== 'limit') params.append(key, value);
      });
      params.append('format', format);

      const response = await axios.get(`/audit-logs/export?${params.toString()}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${Date.now()}.csv`;
        a.click();
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${Date.now()}.json`;
        a.click();
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  const handleMarkReviewed = async (logId) => {
    try {
      await axios.patch(`/audit-logs/${logId}/review`);
      fetchSuspiciousActivities();
      fetchAuditLogs();
    } catch (error) {
      console.error('Error marking as reviewed:', error);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getActionIcon = (action) => {
    if (action.includes('MARKS')) return <FileText size={16} />;
    if (action.includes('ATTENDANCE')) return <CheckCircle size={16} />;
    if (action.includes('HOMEWORK')) return <FileText size={16} />;
    if (action.includes('PLACEMENT')) return <TrendingUp size={16} />;
    return <Activity size={16} />;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="text-blue-500" size={32} />
              Audit Logs & Activity Tracking
            </h1>
            <p className="text-gray-600 mt-2">
              Enterprise-grade tracking of all system actions and modifications
            </p>
          </div>
          {user?.role === 'admin' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport('json')}>
                <Download size={16} className="mr-2" />
                Export JSON
              </Button>
              <Button variant="outline" onClick={() => handleExport('csv')}>
                <Download size={16} className="mr-2" />
                Export CSV
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards (Admin Only) */}
      {user?.role === 'admin' && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Logs</CardTitle>
                <Activity className="text-blue-500" size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statistics.totalCount?.[0]?.total || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Suspicious</CardTitle>
                <AlertTriangle className="text-orange-500" size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {suspiciousActivities.length}
              </div>
              <p className="text-xs text-gray-500 mt-1">Requires review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Recent (24h)</CardTitle>
                <Clock className="text-green-500" size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {recentActivity.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Failed Actions</CardTitle>
                <XCircle className="text-red-500" size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {statistics.recentFailures?.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Logs</TabsTrigger>
          <TabsTrigger value="marks">Marks</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          {user?.role === 'admin' && (
            <>
              <TabsTrigger value="suspicious">Suspicious</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </>
          )}
        </TabsList>

        {/* All Logs Tab */}
        <TabsContent value="all" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter size={18} />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Action Type</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
                  >
                    <option value="">All Actions</option>
                    <option value="MARKS_CREATED">Marks Created</option>
                    <option value="MARKS_UPDATED">Marks Updated</option>
                    <option value="ATTENDANCE_MARKED">Attendance Marked</option>
                    <option value="ATTENDANCE_UPDATED">Attendance Updated</option>
                    <option value="HOMEWORK_GRADED">Homework Graded</option>
                    <option value="SUBMISSION_GRADED">Submission Graded</option>
                    <option value="PLACEMENT_STATUS_CHANGED">Placement Status Changed</option>
                  </select>
                </div>

                <div>
                  <Label>Entity Type</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={filters.entityType}
                    onChange={(e) => setFilters({ ...filters, entityType: e.target.value, page: 1 })}
                  >
                    <option value="">All Types</option>
                    <option value="Marks">Marks</option>
                    <option value="Attendance">Attendance</option>
                    <option value="Homework">Homework</option>
                    <option value="Submission">Submission</option>
                    <option value="Placement">Placement</option>
                  </select>
                </div>

                <div>
                  <Label>Severity</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={filters.severity}
                    onChange={(e) => setFilters({ ...filters, severity: e.target.value, page: 1 })}
                  >
                    <option value="">All Levels</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <Label>Date Range</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
                    />
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Timestamp</th>
                      <th className="text-left py-3 px-4">Action</th>
                      <th className="text-left py-3 px-4">Performed By</th>
                      <th className="text-left py-3 px-4">Affected User</th>
                      <th className="text-center py-3 px-4">Severity</th>
                      <th className="text-center py-3 px-4">Status</th>
                      <th className="text-center py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span className="text-sm font-medium">
                              {log.action.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div className="font-medium">{log.performedBy?.name}</div>
                            <div className="text-gray-500 text-xs">
                              {log.performedBy?.email}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {log.affectedUser ? (
                              <>
                                <div className="font-medium">{log.affectedUser.name}</div>
                                <div className="text-gray-500 text-xs">
                                  {log.affectedUser.rollNumber || log.affectedUser.email}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge className={getSeverityColor(log.severity)}>
                            {log.severity}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge variant={log.status === 'SUCCESS' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Show detailed view in modal
                              alert(JSON.stringify(log, null, 2));
                            }}
                          >
                            <Eye size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Showing {logs.length} of {pagination.total} logs
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={filters.page === 1}
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center px-4 text-sm">
                    Page {filters.page} of {pagination.pages}
                  </div>
                  <Button
                    variant="outline"
                    disabled={filters.page >= pagination.pages}
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marks Logs Tab */}
        <TabsContent value="marks">
          <MarksAuditLogs />
        </TabsContent>

        {/* Attendance Logs Tab */}
        <TabsContent value="attendance">
          <AttendanceAuditLogs />
        </TabsContent>

        {/* Suspicious Activities Tab (Admin Only) */}
        {user?.role === 'admin' && (
          <TabsContent value="suspicious" className="space-y-6">
            {suspiciousActivities.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
                  <p className="text-gray-600">No suspicious activities detected</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {suspiciousActivities.map((log, idx) => (
                  <Card key={idx} className="border-l-4 border-orange-500">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="text-orange-500" size={20} />
                            <h4 className="font-semibold">
                              {log.action.replace(/_/g, ' ')}
                            </h4>
                            <Badge className={getSeverityColor(log.severity)}>
                              {log.severity}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                              <div className="text-xs text-gray-600">Performed By</div>
                              <div className="font-medium">{log.performedBy?.name}</div>
                              <div className="text-xs text-gray-500">{log.performedBy?.email}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600">Affected User</div>
                              <div className="font-medium">{log.affectedUser?.name || '-'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600">Timestamp</div>
                              <div className="font-medium text-sm">{formatDate(log.createdAt)}</div>
                            </div>
                          </div>

                          {log.changes && (
                            <div className="bg-gray-50 p-3 rounded text-sm">
                              <div className="font-medium mb-1">Changes:</div>
                              <pre className="text-xs overflow-x-auto">
                                {JSON.stringify(log.changes, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkReviewed(log._id)}
                        >
                          Mark Reviewed
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Statistics Tab (Admin Only) */}
        {user?.role === 'admin' && statistics && (
          <TabsContent value="statistics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Action */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Common Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statistics.byAction?.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{item._id.replace(/_/g, ' ')}</span>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* By Severity */}
              <Card>
                <CardHeader>
                  <CardTitle>Severity Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statistics.bySeverity?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <Badge className={getSeverityColor(item._id)}>
                          {item._id}
                        </Badge>
                        <span className="text-lg font-bold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// Marks Audit Logs Component
function MarksAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarksLogs();
  }, []);

  const fetchMarksLogs = async () => {
    try {
      const response = await axios.get('/audit-logs/marks');
      setLogs(response.data.data);
    } catch (error) {
      console.error('Error fetching marks logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marks Modification History</CardTitle>
        <CardDescription>Track all marks entries and updates</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-3">
            {logs.map((log, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium">
                      {log.action.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm text-gray-600">
                      by {log.performedBy?.name} • {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <Badge>{log.severity}</Badge>
                </div>
                
                {log.changes && (
                  <div className="mt-2 text-sm">
                    {log.changes.before?.marks && (
                      <div>
                        <span className="text-red-600">Before: {log.changes.before.marks}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">After: {log.changes.after.marks}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Attendance Audit Logs Component
function AttendanceAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendanceLogs();
  }, []);

  const fetchAttendanceLogs = async () => {
    try {
      const response = await axios.get('/audit-logs/attendance');
      setLogs(response.data.data);
    } catch (error) {
      console.error('Error fetching attendance logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Modification History</CardTitle>
        <CardDescription>Track all attendance marking and updates</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-3">
            {logs.map((log, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium">
                      {log.action.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm text-gray-600">
                      by {log.performedBy?.name} • {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <Badge>{log.severity}</Badge>
                </div>
                
                {log.changes && (
                  <div className="mt-2 text-sm">
                    {log.changes.before?.status && (
                      <div>
                        <span className="text-red-600">Before: {log.changes.before.status}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">After: {log.changes.after.status}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
