'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../../components/ui/Card';
import Modal from '../../../components/ui/Modal';
import { PageLoader } from '../../../components/ui/Loading';
import api from '../../../lib/axios';
import { 
  CalendarIcon, 
  BookOpenIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  AcademicCapIcon,
  TrophyIcon,
  CalculatorIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import Badge from '../../../components/ui/Badge';

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [whatIfClasses, setWhatIfClasses] = useState(0);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [showSubjectDeepDive, setShowSubjectDeepDive] = useState(false);
  const [selectedSubjectDetails, setSelectedSubjectDetails] = useState(null);
  const [showAbsentDays, setShowAbsentDays] = useState(false);
  const [showRecoveryPlan, setShowRecoveryPlan] = useState(false);

  useEffect(() => {
    fetchStudentAndSummary();
  }, []);

  const fetchStudentAndSummary = async () => {
    try {
      setLoading(true);
      const studentRes = await api.get('/students/me');
      const studentId = studentRes.data.data._id;
      setStudentData(studentRes.data.data);

      const summaryRes = await api.get(`/attendance/summary/${studentId}`);
      setSummary(summaryRes.data.data || []);

      // Fetch detailed attendance records
      const recordsRes = await api.get(`/attendance/student/${studentId}`);
      setAttendanceRecords(recordsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      setSummary([]);
      setAttendanceRecords([]);
      setStudentData(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateClassesNeeded = (present, total, threshold = 85) => {
    if (total === 0) return 0;
    const currentPercentage = (present / total) * 100;
    if (currentPercentage >= threshold) return 0;
    
    // Calculate: (present + x) / (total + x) = threshold/100
    // Solving for x: x = (threshold * total - 100 * present) / (100 - threshold)
    const needed = Math.ceil((threshold * total - 100 * present) / (100 - threshold));
    return Math.max(0, needed);
  };

  const getAttendanceForDate = (date, subjectId) => {
    const dateStr = date.toISOString().split('T')[0];
    return attendanceRecords.find(
      record => {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        return recordDate === dateStr && 
               (subjectId === 'all' || record.subject._id === subjectId);
      }
    );
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const calculateOverallAttendance = () => {
    if (summary.length === 0) return { percentage: 0, present: 0, total: 0, absent: 0 };
    const totalPresent = summary.reduce((sum, item) => sum + item.presentClasses, 0);
    const totalClasses = summary.reduce((sum, item) => sum + item.totalClasses, 0);
    const totalAbsent = totalClasses - totalPresent;
    const percentage = totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 0;
    return { percentage, present: totalPresent, total: totalClasses, absent: totalAbsent };
  };

  const calculateSafeLeaves = (present, total, threshold = 85) => {
    if (total === 0) return 0;
    // Calculate: (present) / (total + x) >= threshold/100
    // Solving for x: x <= (100 * present - threshold * total) / threshold
    const safeLeaves = Math.floor((100 * present - threshold * total) / threshold);
    return Math.max(0, safeLeaves);
  };

  const calculateWhatIfPercentage = (present, total, additionalClasses, attendAll = true) => {
    const newTotal = total + additionalClasses;
    const newPresent = attendAll ? present + additionalClasses : present;
    return newTotal > 0 ? (newPresent / newTotal) * 100 : 0;
  };

  const handleDayClick = (date, dayRecords) => {
    if (!date || date > new Date()) return;
    setSelectedDay({ date, records: dayRecords });
    setShowDayDetails(true);
  };

  const getAttendanceStatus = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayRecords = attendanceRecords.filter(record => {
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      return recordDate === dateStr;
    });

    if (dayRecords.length === 0) return null;
    
    const presentCount = dayRecords.filter(r => r.status === 'PRESENT').length;
    const totalCount = dayRecords.length;
    
    if (presentCount === totalCount) return 'full-present';
    if (presentCount === 0) return 'full-absent';
    return 'partial';
  };

  const getAbsentDays = () => {
    return attendanceRecords
      .filter(record => record.status === 'ABSENT')
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const generateRecoveryPlan = () => {
    const plans = summary
      .filter(item => item.percentage < THRESHOLD)
      .map(item => {
        const classesNeeded = calculateClassesNeeded(item.presentClasses, item.totalClasses, THRESHOLD);
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + classesNeeded);
        
        return {
          subject: item.subject,
          currentPercentage: item.percentage,
          classesNeeded,
          targetDate,
          presentClasses: item.presentClasses,
          totalClasses: item.totalClasses,
          weeklyTarget: Math.ceil(classesNeeded / 4)
        };
      });
    return plans;
  };

  const handleSubjectClick = (subjectItem) => {
    const subjectRecords = attendanceRecords.filter(
      record => record.subject._id === subjectItem.subject._id
    );
    setSelectedSubjectDetails({
      ...subjectItem,
      records: subjectRecords.sort((a, b) => new Date(b.date) - new Date(a.date))
    });
    setShowSubjectDeepDive(true);
  };

  const filterByDateRange = (records) => {
    if (!dateRange.start && !dateRange.end) return records;
    return records.filter(record => {
      const recordDate = new Date(record.date);
      const start = dateRange.start ? new Date(dateRange.start) : null;
      const end = dateRange.end ? new Date(dateRange.end) : null;
      if (start && end) return recordDate >= start && recordDate <= end;
      if (start) return recordDate >= start;
      if (end) return recordDate <= end;
      return true;
    });
  };

  if (loading) return <PageLoader message="Loading attendance data..." />;

  const THRESHOLD = 85;
  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const overall = calculateOverallAttendance();
  const overallSafe = overall.percentage >= THRESHOLD;
  const safeLeaves = calculateSafeLeaves(overall.present, overall.total, THRESHOLD);

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-6">
          <CalendarIcon className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold">My Attendance</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track your attendance and maintain 85% threshold</p>
          </div>
        </div>

        {/* Overall Attendance Card */}
        <Card className={`p-8 mb-8 ${overallSafe ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800' : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-3 rounded-full ${overallSafe ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'}`}>
                  <TrophyIcon className={`w-8 h-8 ${overallSafe ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Attendance</h2>
                  <p className={`text-5xl font-bold ${overallSafe ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {overall.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              {overallSafe ? (
                <Badge variant="success" className="text-sm">Excellent Performance! 🎉</Badge>
              ) : (
                <Badge variant="danger" className="text-sm">Needs Improvement ⚠️</Badge>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Classes Attended</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{overall.present}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Classes Missed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{overall.absent}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpenIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Classes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{overall.total}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AcademicCapIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Subjects Tracking</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CalculatorIcon className="w-4 h-4" />
                Safe Leave Counter
              </h3>
              {overallSafe && safeLeaves > 0 ? (
                <div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{safeLeaves}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    classes you can safely miss while staying above 85%
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">0</p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Cannot miss any class! Below threshold.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Target Achievement Tracker */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrophyIcon className="w-6 h-6 text-yellow-600" />
            Target Achievement Tracker
          </h2>
          <div className="space-y-4">
            {[
              { target: 90, color: 'blue', label: 'Good' },
              { target: 95, color: 'purple', label: 'Excellent' },
              { target: 100, color: 'yellow', label: 'Perfect' }
            ].map(({ target, color, label }) => {
              const needed = calculateClassesNeeded(overall.present, overall.total, target);
              const progress = Math.min((overall.percentage / target) * 100, 100);
              const achieved = overall.percentage >= target;

              return (
                <div key={target}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{target}% ({label})</span>
                      {achieved && <CheckCircleIcon className={`w-5 h-5 text-${color}-600`} />}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {achieved ? '✓ Achieved!' : `${needed} more classes needed`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full bg-${color}-500 transition-all`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* What-If Calculator & Attendance Simulator */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CalculatorIcon className="w-6 h-6 text-blue-600" />
            Attendance Simulator
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                If I attend next <input 
                  type="number" 
                  min="0" 
                  max="100"
                  value={whatIfClasses}
                  onChange={(e) => setWhatIfClasses(parseInt(e.target.value) || 0)}
                  className="mx-2 w-20 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                /> classes...
              </label>
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your attendance will be:</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {calculateWhatIfPercentage(overall.present, overall.total, whatIfClasses, true).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  New Stats: {overall.present + whatIfClasses}/{overall.total + whatIfClasses} classes
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                If I miss next <input 
                  type="number" 
                  min="0" 
                  max="100"
                  value={whatIfClasses}
                  onChange={(e) => setWhatIfClasses(parseInt(e.target.value) || 0)}
                  className="mx-2 w-20 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                /> classes...
              </label>
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your attendance will drop to:</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {calculateWhatIfPercentage(overall.present, overall.total, whatIfClasses, false).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  New Stats: {overall.present}/{overall.total + whatIfClasses} classes
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Recovery Planner */}
        {generateRecoveryPlan().length > 0 && (
          <Card className="p-6 mb-8 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
                  Recovery Planner
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Step-by-step plan to recover from attendance shortage
                </p>
              </div>
              <button
                onClick={() => setShowRecoveryPlan(!showRecoveryPlan)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                {showRecoveryPlan ? 'Hide Plan' : 'View Plan'}
              </button>
            </div>

            {showRecoveryPlan && (
              <div className="space-y-4 mt-4">
                {generateRecoveryPlan().map((plan, index) => (
                  <div key={plan.subject._id} className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-orange-200 dark:border-orange-700">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{plan.subject.name}</h3>
                        <p className="text-sm text-gray-500">Current: {plan.currentPercentage.toFixed(1)}% | Target: {THRESHOLD}%</p>
                      </div>
                      <Badge variant="danger">{plan.classesNeeded} classes needed</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Step 1: Weekly Target</p>
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          Attend {plan.weeklyTarget} classes/week
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Step 2: Zero Absences</p>
                        <p className="font-semibold text-purple-600 dark:text-purple-400">
                          Don't miss any class
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Step 3: Target Date</p>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {plan.targetDate.toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-900 dark:text-yellow-200">
                        ⚡ <strong>Pro Tip:</strong> Focus on this subject for the next {Math.ceil(plan.classesNeeded / 2)} days to quickly improve your attendance.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Filters: Date Range & Semester */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-purple-600" />
            Filters & Views
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Semester View</label>
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="all">Academic Year (All)</option>
                <option value="sem1">Semester 1</option>
                <option value="sem2">Semester 2</option>
              </select>
            </div>
          </div>
          {(dateRange.start || dateRange.end) && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="info">
                Showing: {dateRange.start || 'Start'} to {dateRange.end || 'End'}
              </Badge>
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear Filter
              </button>
            </div>
          )}
        </Card>

        {/* Absent Days List */}
        <Card className="p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <XCircleIcon className="w-6 h-6 text-red-600" />
              Absent Days History
            </h2>
            <button
              onClick={() => setShowAbsentDays(!showAbsentDays)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
            >
              {showAbsentDays ? 'Hide' : 'View All'} ({getAbsentDays().length})
            </button>
          </div>

          {showAbsentDays && (
            <div className="mt-4">
              {getAbsentDays().length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getAbsentDays().map((record, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-800 rounded">
                          <CalendarIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="font-semibold">{record.subject?.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(record.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="danger">ABSENT</Badge>
                        {record.remarks && (
                          <p className="text-xs text-gray-500 mt-1">{record.remarks}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-3" />
                  <p>No absent days! Perfect attendance! 🎉</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Subject Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {summary.map((item) => {
            const classesNeeded = calculateClassesNeeded(item.presentClasses, item.totalClasses, THRESHOLD);
            const percentage = item.percentage;
            const isSafe = percentage >= THRESHOLD;

            return (
              <Card key={item._id} className={`p-6 ${!isSafe ? 'border-l-4 border-red-500' : 'border-l-4 border-green-500'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {item.subject.name}
                    </h3>
                    <p className="text-xs text-gray-500">{item.subject.subjectCode}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${isSafe ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
                  <div 
                    className={`h-3 rounded-full transition-all ${isSafe ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Attended</p>
                    <p className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircleIcon className="w-4 h-4" />
                      {item.presentClasses}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Absent</p>
                    <p className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <XCircleIcon className="w-4 h-4" />
                      {item.totalClasses - item.presentClasses}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Total Classes</p>
                    <p className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <BookOpenIcon className="w-4 h-4" />
                      {item.totalClasses}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Status</p>
                    {isSafe ? (
                      <Badge variant="success" className="mt-1">Safe ✓</Badge>
                    ) : (
                      <Badge variant="danger" className="mt-1">Shortage!</Badge>
                    )}
                  </div>
                </div>

                {!isSafe && classesNeeded > 0 && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                          Attend {classesNeeded} more {classesNeeded === 1 ? 'class' : 'classes'}
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          to reach 85% attendance (cannot miss any)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isSafe && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-900 dark:text-green-200 flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5" />
                      You're doing great! Keep it up.
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Subject Comparison Chart */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <ChartBarIcon className="w-6 h-6 text-purple-600" />
            Subject-wise Comparison (Click for Details)
          </h2>
          <div className="space-y-4">
            {summary.map((item) => {
              const width = Math.min(item.percentage, 100);
              const isSafe = item.percentage >= THRESHOLD;
              
              return (
                <div 
                  key={item._id}
                  onClick={() => handleSubjectClick(item)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-3 rounded-lg transition"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex-1">
                      <span className="font-medium">{item.subject.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({item.subject.subjectCode})</span>
                      <span className="text-xs text-blue-600 ml-2">→ Click for details</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.presentClasses}/{item.totalClasses}
                      </span>
                      <Badge variant={isSafe ? 'success' : 'danger'}>
                        {item.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className={`h-6 rounded-full transition-all ${isSafe ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}
                      style={{ width: `${width}%` }}
                    >
                      <span className="absolute left-2 top-1 text-xs font-medium text-white">
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Calendar View */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
              Attendance Calendar
            </h2>
            <div className="flex items-center gap-4">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="all">All Subjects</option>
                {summary.map(item => (
                  <option key={item._id} value={item.subject._id}>
                    {item.subject.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  ←
                </button>
                <span className="font-semibold text-lg min-w-[200px] text-center">
                  {monthName}
                </span>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-sm text-gray-600 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}
            {days.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const attendance = getAttendanceForDate(date, selectedSubject);
              const isToday = date.toDateString() === new Date().toDateString();
              const isFuture = date > new Date();
              
              // Get all attendance records for this date
              const dateStr = date.toISOString().split('T')[0];
              const dayRecords = attendanceRecords.filter(record => {
                const recordDate = new Date(record.date).toISOString().split('T')[0];
                return recordDate === dateStr && 
                       (selectedSubject === 'all' || record.subject._id === selectedSubject);
              });
              
              const presentCount = dayRecords.filter(r => r.status === 'PRESENT').length;
              const absentCount = dayRecords.filter(r => r.status === 'ABSENT').length;
              const totalCount = dayRecords.length;
              
              let dayStatus = null;
              if (totalCount > 0) {
                if (presentCount === totalCount) dayStatus = 'full-present';
                else if (absentCount === totalCount) dayStatus = 'full-absent';
                else dayStatus = 'partial';
              }

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => handleDayClick(date, dayRecords)}
                  className={`
                    aspect-square border rounded-lg p-1 text-center relative cursor-pointer hover:shadow-md transition-all
                    ${isToday ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200 dark:border-gray-700'}
                    ${isFuture ? 'bg-gray-50 dark:bg-gray-900 opacity-50 cursor-not-allowed' : 'bg-white dark:bg-gray-800'}
                    ${dayStatus === 'full-present' ? 'bg-green-100 dark:bg-green-900/30 border-green-300' : ''}
                    ${dayStatus === 'full-absent' ? 'bg-red-100 dark:bg-red-900/30 border-red-300' : ''}
                    ${dayStatus === 'partial' ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300' : ''}
                  `}
                >
                  <div className="text-xs font-medium mb-1">{date.getDate()}</div>
                  {totalCount > 0 && (
                    <div className="space-y-0.5">
                      <div className="text-xs flex justify-center gap-1">
                        {presentCount > 0 && (
                          <span className="bg-green-500 text-white px-1 rounded text-[10px]">
                            P:{presentCount}
                          </span>
                        )}
                        {absentCount > 0 && (
                          <span className="bg-red-500 text-white px-1 rounded text-[10px]">
                            A:{absentCount}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-400">
                        {totalCount} class{totalCount > 1 ? 'es' : ''}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 mt-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 border border-green-500 rounded"></div>
              <span>Full Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-100 dark:bg-red-900/30 border border-red-500 rounded"></div>
              <span>Full Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500 rounded"></div>
              <span>Partial Attendance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-500 rounded"></div>
              <span>Today</span>
            </div>
          </div>
        </Card>

        {/* Subject Deep Dive Modal */}
        <Modal
          isOpen={showSubjectDeepDive}
          onClose={() => setShowSubjectDeepDive(false)}
          title={selectedSubjectDetails ? `${selectedSubjectDetails.subject.name} - Detailed Breakdown` : ''}
        >
          {selectedSubjectDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Present</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {selectedSubjectDetails.presentClasses}
                  </p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Absent</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {selectedSubjectDetails.totalClasses - selectedSubjectDetails.presentClasses}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Percentage</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedSubjectDetails.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Day-by-Day Breakdown</h4>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {selectedSubjectDetails.records && selectedSubjectDetails.records.length > 0 ? (
                    selectedSubjectDetails.records.map((record, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border ${
                          record.status === 'PRESENT' 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">
                              {new Date(record.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            {record.remarks && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Note: {record.remarks}
                              </p>
                            )}
                          </div>
                          <Badge variant={record.status === 'PRESENT' ? 'success' : 'danger'}>
                            {record.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">No detailed records available</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Day Details Modal */}
        <Modal
          isOpen={showDayDetails}
          onClose={() => setShowDayDetails(false)}
          title={selectedDay ? `Attendance Details - ${selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
        >
          {selectedDay && (
            <div className="space-y-4">
              {selectedDay.records && selectedDay.records.length > 0 ? (
                <div className="space-y-3">
                  {selectedDay.records.map((record, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      record.status === 'PRESENT' 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">{record.subject?.name || 'Subject'}</h3>
                        <Badge variant={record.status === 'PRESENT' ? 'success' : 'danger'}>
                          {record.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <BookOpenIcon className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Subject Code</p>
                            <p className="font-medium">{record.subject?.code || 'N/A'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <ClockIcon className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Time</p>
                            <p className="font-medium">
                              {record.createdAt 
                                ? new Date(record.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {record.remarks && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Remarks:</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{record.remarks}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span>Day Summary:</span>
                      <div className="flex gap-2">
                        <span className="text-green-600">Present: {selectedDay.records.filter(r => r.status === 'PRESENT').length}</span>
                        <span className="text-red-600">Absent: {selectedDay.records.filter(r => r.status === 'ABSENT').length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No attendance record for this day</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    This could be a holiday, weekend, or no classes were scheduled.
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
