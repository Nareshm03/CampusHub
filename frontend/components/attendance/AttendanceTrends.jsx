'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const ResponsiveContainer = dynamic(() => import('recharts').then((recharts) => recharts.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import('recharts').then((recharts) => recharts.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then((recharts) => recharts.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((recharts) => recharts.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((recharts) => recharts.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((recharts) => recharts.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((recharts) => recharts.Tooltip), { ssr: false });
const BarChart = dynamic(() => import('recharts').then((recharts) => recharts.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((recharts) => recharts.Bar), { ssr: false });
const Cell = dynamic(() => import('recharts').then((recharts) => recharts.Cell), { ssr: false });
import api from '../../lib/axios';
import Card from '../ui/Card';
import { PageLoader } from '../ui/Loading';
import { toast } from 'sonner';

const AttendanceTrends = ({ studentId }) => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    if (studentId) {
      fetchTrends();
    }
  }, [studentId, period]);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/attendance/trends/${studentId}?period=${period}`);
      setTrends(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch attendance trends');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader message="Loading analytics..." />;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-1">{label}</p>
          <p className="text-primary-600 dark:text-primary-400 font-bold">
            {payload[0].value.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">
            Total Classes: {payload[0].payload.total}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Attendance Trends</h2>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              period === 'week' 
                ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400 font-medium' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              period === 'month' 
                ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400 font-medium' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <Card className="p-6 h-[400px]">
        {trends.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
              <XAxis 
                dataKey="_id" 
                stroke="#9ca3af" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                domain={[0, 100]} 
                stroke="#9ca3af" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="percentage" 
                stroke="#4f46e5" 
                strokeWidth={3}
                dot={{ fill: '#4f46e5', strokeWidth: 2, r: 4, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <p>No attendance data available for the selected period.</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">Average Attendance</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {(trends.reduce((acc, curr) => acc + curr.percentage, 0) / (trends.length || 1)).toFixed(1)}%
          </p>
        </Card>
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Classes Attended</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {trends.reduce((acc, curr) => acc + curr.present, 0)}
          </p>
        </Card>
        <Card className="p-4 bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20">
          <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Classes</p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {trends.reduce((acc, curr) => acc + curr.total, 0)}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceTrends;
