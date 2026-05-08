'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from '@/lib/axios';
import { BarChart, LineChart, PieChart, RadarChart, ProgressRing } from '@/components/Charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, TrendingUp, AlertTriangle, CheckCircle, Award, Clock, FileText } from 'lucide-react';

export default function FacultyWorkloadDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectDetails, setSubjectDetails] = useState(null);
  const [plagiarismTrends, setPlagiarismTrends] = useState(null);
  const [attendanceConsistency, setAttendanceConsistency] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchPlagiarismTrends();
    fetchAttendanceConsistency();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/faculty-analytics/dashboard');
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectDetails = async (subjectId) => {
    try {
      const response = await axios.get(`/faculty-analytics/subject/${subjectId}`);
      setSubjectDetails(response.data.data);
      setSelectedSubject(subjectId);
    } catch (error) {
      console.error('Error fetching subject details:', error);
    }
  };

  const fetchPlagiarismTrends = async (subjectId = null) => {
    try {
      const params = subjectId ? { subjectId } : {};
      const response = await axios.get('/faculty-analytics/plagiarism-trends', { params });
      setPlagiarismTrends(response.data.data);
    } catch (error) {
      console.error('Error fetching plagiarism trends:', error);
    }
  };

  const fetchAttendanceConsistency = async (subjectId = null) => {
    try {
      const params = subjectId ? { subjectId } : {};
      const response = await axios.get('/faculty-analytics/attendance-consistency', { params });
      setAttendanceConsistency(response.data.data);
    } catch (error) {
      console.error('Error fetching attendance consistency:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { overview, subjects, workload, recentActivities } = dashboardData;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Faculty Workload & Effectiveness Dashboard</h1>
        <p className="text-gray-600">
          Teaching analytics, student performance insights, and plagiarism tracking
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Subjects Handled</CardTitle>
              <BookOpen className="text-blue-500" size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.totalSubjects}</div>
            <p className="text-xs text-gray-500 mt-1">Across {workload.semesterDistribution ? Object.keys(workload.semesterDistribution).length : 0} semesters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
              <Users className="text-green-500" size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.totalStudents}</div>
            <Badge variant={overview.workloadLevel === 'Heavy' || overview.workloadLevel === 'Very Heavy' ? 'destructive' : 'secondary'} className="mt-2">
              {overview.workloadLevel} Workload
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Performance</CardTitle>
              <TrendingUp className="text-purple-500" size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(overview.averagePerformance || 0).toFixed(1)}%</div>
            <div className="mt-2">
              <ProgressRing
                percentage={overview.averagePerformance || 0}
                size={60}
                strokeWidth={6}
                color={(overview.averagePerformance || 0) >= 75 ? '#10b981' : (overview.averagePerformance || 0) >= 60 ? '#f59e0b' : '#ef4444'}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Attendance</CardTitle>
              <CheckCircle className="text-orange-500" size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(overview.averageAttendance || 0).toFixed(1)}%</div>
            <div className="mt-2">
              <ProgressRing
                percentage={overview.averageAttendance || 0}
                size={60}
                strokeWidth={6}
                color="#f59e0b"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="subjects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subjects">My Subjects</TabsTrigger>
          <TabsTrigger value="plagiarism">Plagiarism Trends</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Analytics</TabsTrigger>
          <TabsTrigger value="workload">Workload Distribution</TabsTrigger>
        </TabsList>

        {/* Subjects Tab */}
        <TabsContent value="subjects" className="space-y-6">
          {/* Subject Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {subjects.map((subject, index) => (
              <Card 
                key={index} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => fetchSubjectDetails(subject.subject.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{subject.subject.name}</CardTitle>
                      <CardDescription>
                        {subject.subject.code} • Semester {subject.subject.semester}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{subject.students.unique} Students</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Performance */}
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Avg Performance</div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold">{(subject.performance?.average || 0).toFixed(1)}%</div>
                        <Badge 
                          variant={(subject.performance?.average || 0) >= 75 ? 'default' : (subject.performance?.average || 0) >= 60 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {(subject.performance?.average || 0) >= 75 ? 'Good' : (subject.performance?.average || 0) >= 60 ? 'Average' : 'Needs Attention'}
                        </Badge>
                      </div>
                    </div>

                    {/* Attendance */}
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Attendance</div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold">{(subject.attendance?.averageAttendance || 0).toFixed(1)}%</div>
                        <Badge variant="outline" className="text-xs">
                          {subject.attendance?.consistency || 'N/A'} Consistency
                        </Badge>
                      </div>
                    </div>

                    {/* Homework */}
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Homework Stats</div>
                      <div className="text-sm">
                        <div>{subject.homework?.totalAssignments || 0} Assignments</div>
                        <div className="text-xs text-gray-500">
                          {(subject.homework?.averageSubmissionRate || 0).toFixed(1)}% Submission Rate
                        </div>
                      </div>
                    </div>

                    {/* Plagiarism */}
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Plagiarism</div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">{(subject.homework?.averagePlagiarismScore || 0).toFixed(1)}%</div>
                        <Badge 
                          variant={(subject.homework?.averagePlagiarismScore || 0) < 20 ? 'default' : (subject.homework?.averagePlagiarismScore || 0) < 40 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {subject.homework?.plagiarismTrend || 'N/A'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Grade Distribution Mini Chart */}
                  <div className="mt-4">
                    <div className="text-xs text-gray-600 mb-2">Grade Distribution</div>
                    <div className="flex gap-1 h-12">
                      {Object.entries(subject.performance.gradeDistribution || {}).map(([grade, count]) => {
                        const percentage = subject.performance.totalStudents > 0 
                          ? (count / subject.performance.totalStudents) * 100 
                          : 0;
                        const colorMap = {
                          'A+ (90-100)': 'bg-green-500',
                          'A (80-89)': 'bg-green-400',
                          'B+ (70-79)': 'bg-blue-500',
                          'B (60-69)': 'bg-blue-400',
                          'C (50-59)': 'bg-yellow-500',
                          'D (40-49)': 'bg-orange-500',
                          'F (<40)': 'bg-red-500'
                        };
                        return (
                          <div
                            key={grade}
                            className={`flex-1 ${colorMap[grade]} rounded-sm relative group`}
                            style={{ height: `${percentage}%` }}
                          >
                            <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {grade}: {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Subject Details Modal/Section */}
          {subjectDetails && selectedSubject && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{subjectDetails.subject.name} - Detailed Analytics</CardTitle>
                    <CardDescription>{subjectDetails.subject.code}</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setSubjectDetails(null)}>Close</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="performance">
                  <TabsList>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="homework">Homework</TabsTrigger>
                    <TabsTrigger value="atrisk">At-Risk Students</TabsTrigger>
                  </TabsList>

                  <TabsContent value="performance" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Performance Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <BarChart
                            data={subjectDetails.performanceDistribution.map(d => ({
                              label: d.label,
                              value: d.count
                            }))}
                            height={250}
                            color="#3b82f6"
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Attendance Pattern (Last 30 Days)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <LineChart
                            data={subjectDetails.attendancePatterns.map(p => ({
                              label: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                              value: p.attendanceRate
                            }))}
                            height={250}
                            showGrid={true}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="students" className="mt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Student</th>
                            <th className="text-center py-3 px-4">Roll No</th>
                            <th className="text-center py-3 px-4">Avg Score</th>
                            <th className="text-center py-3 px-4">Attendance</th>
                            <th className="text-center py-3 px-4">Homework</th>
                            <th className="text-center py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectDetails.students.map((student, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{student.student.name}</td>
                              <td className="text-center py-3 px-4">{student.student.rollNumber}</td>
                              <td className="text-center py-3 px-4">
                                <span className={`font-semibold ${
                                  student.performance.average >= 75 ? 'text-green-600' :
                                  student.performance.average >= 60 ? 'text-blue-600' :
                                  student.performance.average >= 40 ? 'text-orange-600' : 'text-red-600'
                                }`}>
                                  {student.performance.average.toFixed(1)}%
                                </span>
                              </td>
                              <td className="text-center py-3 px-4">
                                <div>{student.attendance.rate.toFixed(1)}%</div>
                                <div className="text-xs text-gray-500">
                                  {student.attendance.present}/{student.attendance.total}
                                </div>
                              </td>
                              <td className="text-center py-3 px-4">
                                <div>{student.homework.submissionRate.toFixed(1)}%</div>
                                <div className="text-xs text-gray-500">
                                  {student.homework.submitted}/{student.homework.total}
                                </div>
                              </td>
                              <td className="text-center py-3 px-4">
                                <Badge variant={
                                  student.performance.average >= 75 && student.attendance.rate >= 85 ? 'default' :
                                  student.performance.average < 50 || student.attendance.rate < 75 ? 'destructive' : 'secondary'
                                }>
                                  {student.performance.average >= 75 && student.attendance.rate >= 85 ? 'Excellent' :
                                   student.performance.average < 50 || student.attendance.rate < 75 ? 'At Risk' : 'Average'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="homework" className="mt-6">
                    <div className="space-y-4">
                      {subjectDetails.homeworkAnalytics.map((hw, idx) => (
                        <Card key={idx}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="font-semibold">{hw.title}</h4>
                                <p className="text-sm text-gray-600">
                                  Due: {new Date(hw.dueDate).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {hw.totalSubmissions} Submissions
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <div className="text-xs text-gray-600">On Time</div>
                                <div className="text-lg font-semibold text-green-600">{hw.onTimeSubmissions}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600">Late</div>
                                <div className="text-lg font-semibold text-orange-600">{hw.lateSubmissions}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600">Avg Plagiarism</div>
                                <div className="text-lg font-semibold">{hw.averagePlagiarismScore.toFixed(1)}%</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600">High Risk</div>
                                <div className="text-lg font-semibold text-red-600">{hw.highPlagiarismCount}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="atrisk" className="mt-6">
                    {subjectDetails.studentsNeedingAttention.length === 0 ? (
                      <Card>
                        <CardContent className="text-center py-12">
                          <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
                          <p className="text-gray-600">No students requiring immediate attention</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {subjectDetails.studentsNeedingAttention.map((student, idx) => (
                          <Card key={idx} className="border-l-4 border-red-500">
                            <CardContent className="pt-6">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h4 className="font-semibold">{student.student.name}</h4>
                                  <p className="text-sm text-gray-600">{student.student.rollNumber}</p>
                                </div>
                                <Badge variant="destructive">{student.riskLevel} Risk</Badge>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 mb-3">
                                <div>
                                  <div className="text-xs text-gray-600">Performance</div>
                                  <div className={`text-lg font-semibold ${student.riskFactors.lowPerformance ? 'text-red-600' : ''}`}>
                                    {student.performance.average.toFixed(1)}%
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600">Attendance</div>
                                  <div className={`text-lg font-semibold ${student.riskFactors.lowAttendance ? 'text-red-600' : ''}`}>
                                    {student.attendance.rate.toFixed(1)}%
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600">Submissions</div>
                                  <div className={`text-lg font-semibold ${student.riskFactors.lowSubmissions ? 'text-red-600' : ''}`}>
                                    {student.homework.submissionRate.toFixed(1)}%
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2 flex-wrap">
                                {student.riskFactors.lowPerformance && (
                                  <Badge variant="destructive">Low Performance</Badge>
                                )}
                                {student.riskFactors.lowAttendance && (
                                  <Badge variant="destructive">Poor Attendance</Badge>
                                )}
                                {student.riskFactors.lowSubmissions && (
                                  <Badge variant="destructive">Low Submissions</Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Plagiarism Trends Tab */}
        <TabsContent value="plagiarism" className="space-y-6">
          {plagiarismTrends && (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Total Submissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{plagiarismTrends.overall.totalSubmissions}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Flagged</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{plagiarismTrends.overall.flaggedSubmissions}</div>
                    <p className="text-xs text-gray-500">Score &gt; 30%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">High Risk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{plagiarismTrends.overall.highRiskCount}</div>
                    <p className="text-xs text-gray-500">Score &gt; 60%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Avg Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{plagiarismTrends.overall.averagePlagiarismScore.toFixed(1)}%</div>
                  </CardContent>
                </Card>
              </div>

              {/* Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Plagiarism Trends</CardTitle>
                  <CardDescription>Plagiarism detection over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <LineChart
                    data={plagiarismTrends.trends.map(t => ({
                      label: t.week,
                      value: t.averageScore
                    }))}
                    height={300}
                    showGrid={true}
                    xLabel="Week"
                    yLabel="Avg Plagiarism Score"
                  />
                </CardContent>
              </Card>

              {/* Severity Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Severity Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <PieChart
                    data={[
                      { label: 'Low (<30%)', value: plagiarismTrends.severityDistribution.low },
                      { label: 'Medium (30-60%)', value: plagiarismTrends.severityDistribution.medium },
                      { label: 'High (60-80%)', value: plagiarismTrends.severityDistribution.high },
                      { label: 'Critical (>80%)', value: plagiarismTrends.severityDistribution.critical }
                    ]}
                    size={300}
                  />
                </CardContent>
              </Card>

              {/* Repeat Offenders */}
              {plagiarismTrends.repeatOffenders.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Repeat Offenders</CardTitle>
                    <CardDescription>Students with multiple high plagiarism scores</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {plagiarismTrends.repeatOffenders.map((offender, idx) => (
                        <div key={idx} className="flex items-start justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex-1">
                            <div className="font-semibold">{offender.student.name}</div>
                            <div className="text-sm text-gray-600">{offender.student.rollNumber}</div>
                            <div className="mt-2 space-y-1">
                              {offender.violations.slice(0, 3).map((v, vidx) => (
                                <div key={vidx} className="text-xs">
                                  <span className="font-medium">{v.homework}</span>
                                  <span className="text-red-600 ml-2">{v.score.toFixed(1)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive">{offender.riskLevel} Risk</Badge>
                            <div className="text-sm text-gray-600 mt-1">
                              {offender.violationCount} violations
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Attendance Consistency Tab */}
        <TabsContent value="attendance" className="space-y-6">
          {attendanceConsistency && (
            <>
              {/* Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Total Classes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{attendanceConsistency.overall.totalClasses}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Avg Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{attendanceConsistency.overall.averageAttendance.toFixed(1)}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Consistency Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{attendanceConsistency.overall.consistencyScore.toFixed(1)}</div>
                    <p className="text-xs text-gray-500">Out of 100</p>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Attendance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    data={attendanceConsistency.monthlyTrends.map(t => ({
                      label: t.month,
                      value: t.attendanceRate
                    }))}
                    height={300}
                    showGrid={true}
                  />
                </CardContent>
              </Card>

              {/* Day-wise Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle>Day-wise Attendance Pattern</CardTitle>
                  <CardDescription>Which days have better/worse attendance</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={attendanceConsistency.dayWisePatterns.map(d => ({
                      label: d.day,
                      value: d.attendanceRate
                    }))}
                    height={300}
                    color="#10b981"
                  />
                </CardContent>
              </Card>

              {/* Irregular Patterns */}
              {attendanceConsistency.irregularPatterns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Students with Irregular Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Student</th>
                            <th className="text-center py-3 px-4">Attendance Rate</th>
                            <th className="text-center py-3 px-4">Absences</th>
                            <th className="text-center py-3 px-4">Total Classes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceConsistency.irregularPatterns.map((student, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{student.student.name}</td>
                              <td className="text-center py-3 px-4">
                                <span className={`font-semibold ${
                                  student.attendanceRate >= 75 ? 'text-green-600' :
                                  student.attendanceRate >= 60 ? 'text-orange-600' : 'text-red-600'
                                }`}>
                                  {student.attendanceRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="text-center py-3 px-4 text-red-600 font-semibold">
                                {student.absenceCount}
                              </td>
                              <td className="text-center py-3 px-4">{student.totalClasses}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Workload Distribution Tab */}
        <TabsContent value="workload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Semester Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Semester Distribution</CardTitle>
                <CardDescription>Subjects across semesters</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={Object.entries(workload.semesterDistribution || {}).map(([sem, count]) => ({
                    label: sem,
                    value: count
                  }))}
                  height={250}
                  color="#8b5cf6"
                />
              </CardContent>
            </Card>

            {/* Workload Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Workload Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Subjects Teaching</span>
                    <span className="font-bold text-lg">{workload.subjectCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Total Students</span>
                    <span className="font-bold text-lg">{workload.studentCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Homework Assignments</span>
                    <span className="font-bold text-lg">{workload.homeworkLoad}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Est. Classes/Week</span>
                    <span className="font-bold text-lg">{workload.classesPerWeek}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="homework">
                <TabsList>
                  <TabsTrigger value="homework">Recent Homework</TabsTrigger>
                  <TabsTrigger value="grading">Recent Grading</TabsTrigger>
                </TabsList>

                <TabsContent value="homework" className="mt-4">
                  <div className="space-y-3">
                    {recentActivities.recentHomeworks.map((hw, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{hw.title}</div>
                          <div className="text-sm text-gray-600">{hw.subject}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">{hw.submissions} submissions</div>
                          <div className="text-xs text-gray-500">
                            Due: {new Date(hw.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="grading" className="mt-4">
                  <div className="space-y-3">
                    {recentActivities.recentGradings.map((grading, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{grading.student}</div>
                          <div className="text-sm text-gray-600">{grading.subject}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{grading.marks}/{grading.total}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(grading.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
