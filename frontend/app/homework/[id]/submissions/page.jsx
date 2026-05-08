'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import axios from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Input from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, Download, AlertTriangle, CheckCircle, 
  User, Calendar, TrendingUp, RefreshCw, Eye 
} from 'lucide-react';

export default function SubmissionsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [homework, setHomework] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [runningPlagiarism, setRunningPlagiarism] = useState(false);
  const [gradeData, setGradeData] = useState({
    grade: '',
    feedback: '',
    resubmissionAllowed: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchHomework();
    fetchSubmissions();
  }, [id]);

  const fetchHomework = async () => {
    try {
      const response = await axios.get(`/api/homework/${id}`);
      setHomework(response.data.data);
    } catch (err) {
      setError('Failed to fetch homework details');
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await axios.get(`/api/homework/${id}/submissions`);
      setSubmissions(response.data.data);
    } catch (err) {
      setError('Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setGrading(true);

    try {
      await axios.post(
        `/api/homework/submissions/${selectedSubmission._id}/grade`,
        gradeData
      );

      setSuccess('Submission graded successfully');
      setSelectedSubmission(null);
      setGradeData({ grade: '', feedback: '', resubmissionAllowed: false });
      fetchSubmissions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to grade submission');
    } finally {
      setGrading(false);
    }
  };

  const handlePlagiarismCheck = async (submissionId) => {
    setRunningPlagiarism(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        `/api/homework/submissions/${submissionId}/plagiarism-check`
      );

      setSuccess(
        `Plagiarism check complete. Score: ${response.data.data.plagiarismScore}%`
      );
      fetchSubmissions();
    } catch (err) {
      setError('Failed to run plagiarism check');
    } finally {
      setRunningPlagiarism(false);
    }
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

  const getPlagiarismColor = (score) => {
    if (score >= 70) return 'bg-red-600';
    if (score >= 50) return 'bg-orange-600';
    if (score >= 30) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  const getStats = () => {
    const total = submissions.length;
    const graded = submissions.filter(s => s.status === 'graded').length;
    const late = submissions.filter(s => s.isLate).length;
    const avgGrade = submissions.filter(s => s.grade !== undefined)
      .reduce((sum, s) => sum + (s.adjustedGrade || s.grade), 0) / (graded || 1);

    return { total, graded, late, avgGrade: avgGrade.toFixed(2) };
  };

  const stats = getStats();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <Button variant="outline" onClick={() => router.push('/homework')} className="mb-4">
        ← Back to Homework
      </Button>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Homework Info */}
      {homework && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{homework.title}</CardTitle>
            <div className="text-sm text-gray-600">
              {homework.course?.name} • Due: {formatDate(homework.dueDate)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-md">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Submissions</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-md">
                <div className="text-2xl font-bold text-green-600">{stats.graded}</div>
                <div className="text-sm text-gray-600">Graded</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-md">
                <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
                <div className="text-sm text-gray-600">Late Submissions</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-md">
                <div className="text-2xl font-bold text-purple-600">{stats.avgGrade}</div>
                <div className="text-sm text-gray-600">Average Grade</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submissions List */}
        <div>
          <h2 className="text-xl font-bold mb-4">Submissions</h2>
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No submissions yet
                </CardContent>
              </Card>
            ) : (
              submissions.map(submission => (
                <Card 
                  key={submission._id}
                  className={`cursor-pointer transition-all ${
                    selectedSubmission?._id === submission._id 
                      ? 'ring-2 ring-blue-500' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedSubmission(submission)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-semibold">
                          {submission.student?.name || 'Unknown Student'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {submission.status === 'graded' ? (
                          <Badge variant="default">Graded</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                        {submission.isLate && (
                          <Badge variant="destructive">Late</Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(submission.submittedAt)}
                      </div>
                      
                      {submission.isPlagiarismChecked && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Plagiarism: {submission.plagiarismScore}%</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[100px]">
                            <div
                              className={`h-1.5 rounded-full ${getPlagiarismColor(submission.plagiarismScore)}`}
                              style={{ width: `${Math.min(submission.plagiarismScore, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {submission.grade !== undefined && (
                        <div className="flex items-center gap-1 font-semibold text-blue-600">
                          <TrendingUp className="h-3 w-3" />
                          Grade: {submission.adjustedGrade || submission.grade}/{homework?.totalPoints}
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {submission.files?.length || 0} file(s)
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Submission Details & Grading */}
        <div>
          {selectedSubmission ? (
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Submission Details</span>
                  {!selectedSubmission.isPlagiarismChecked && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handlePlagiarismCheck(selectedSubmission._id)}
                      disabled={runningPlagiarism}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${runningPlagiarism ? 'animate-spin' : ''}`} />
                      Check Plagiarism
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Student Info */}
                <div>
                  <h3 className="font-semibold mb-2">Student</h3>
                  <div className="text-sm">
                    <div>{selectedSubmission.student?.name}</div>
                    <div className="text-gray-600">{selectedSubmission.student?.email}</div>
                    <div className="text-gray-600">Roll: {selectedSubmission.student?.rollNumber}</div>
                  </div>
                </div>

                {/* Submission Info */}
                <div>
                  <h3 className="font-semibold mb-2">Submission Info</h3>
                  <div className="text-sm space-y-1">
                    <div>Submitted: {formatDate(selectedSubmission.submittedAt)}</div>
                    {selectedSubmission.isLate && (
                      <div className="text-red-600">
                        Late by {selectedSubmission.daysLate} day(s) 
                        ({selectedSubmission.latePenalty}% penalty)
                      </div>
                    )}
                    <div>Version: {selectedSubmission.version}</div>
                  </div>
                </div>

                {/* Files */}
                {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Submitted Files</h3>
                    <div className="space-y-2">
                      {selectedSubmission.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>{file.originalName}</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => window.open(`/api/homework/submissions/${selectedSubmission._id}/download/${index}`, '_blank')}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Text Content */}
                {selectedSubmission.textContent && (
                  <div>
                    <h3 className="font-semibold mb-2">Written Response</h3>
                    <div className="text-sm p-3 bg-gray-50 rounded max-h-48 overflow-y-auto">
                      {selectedSubmission.textContent}
                    </div>
                  </div>
                )}

                {/* Plagiarism Details */}
                {selectedSubmission.isPlagiarismChecked && (
                  <div>
                    <h3 className="font-semibold mb-2">Plagiarism Analysis</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Overall Score:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getPlagiarismColor(selectedSubmission.plagiarismScore)}`}
                            style={{ width: `${selectedSubmission.plagiarismScore}%` }}
                          />
                        </div>
                        <span className="font-bold">{selectedSubmission.plagiarismScore}%</span>
                      </div>

                      {selectedSubmission.plagiarismDetails && selectedSubmission.plagiarismDetails.length > 0 && (
                        <div className="text-sm">
                          <div className="font-semibold mb-1">Matches Found:</div>
                          {selectedSubmission.plagiarismDetails.slice(0, 3).map((detail, i) => (
                            <div key={i} className="p-2 bg-yellow-50 rounded mb-1">
                              Match with student (Score: {detail.similarityScore}%)
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Grading Form */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">
                    {selectedSubmission.status === 'graded' ? 'Update Grade' : 'Grade Submission'}
                  </h3>
                  <form onSubmit={handleGradeSubmit} className="space-y-3">
                    <div>
                      <Label htmlFor="grade">Grade (out of {homework?.totalPoints})</Label>
                      <Input
                        type="number"
                        id="grade"
                        value={gradeData.grade}
                        onChange={(e) => setGradeData({ ...gradeData, grade: e.target.value })}
                        min="0"
                        max={homework?.totalPoints}
                        step="0.5"
                        required
                      />
                      {selectedSubmission.latePenalty > 0 && (
                        <p className="text-sm text-gray-600 mt-1">
                          After {selectedSubmission.latePenalty}% late penalty: 
                          {' '}{(gradeData.grade * (100 - selectedSubmission.latePenalty) / 100).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="feedback">Feedback</Label>
                      <Textarea
                        id="feedback"
                        value={gradeData.feedback}
                        onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                        rows={4}
                        placeholder="Provide feedback to the student..."
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="resubmissionAllowed"
                        checked={gradeData.resubmissionAllowed}
                        onChange={(e) => setGradeData({ ...gradeData, resubmissionAllowed: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="resubmissionAllowed">Allow Resubmission</Label>
                    </div>

                    <Button type="submit" disabled={grading} className="w-full">
                      {grading ? 'Submitting...' : 'Submit Grade'}
                    </Button>
                  </form>
                </div>

                {/* Existing Grade */}
                {selectedSubmission.status === 'graded' && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Current Grade</h3>
                    <div className="bg-blue-50 p-3 rounded space-y-1 text-sm">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedSubmission.adjustedGrade || selectedSubmission.grade}/{homework?.totalPoints}
                      </div>
                      {selectedSubmission.feedback && (
                        <div className="text-gray-700 mt-2">
                          <span className="font-semibold">Feedback:</span>
                          <div className="mt-1">{selectedSubmission.feedback}</div>
                        </div>
                      )}
                      <div className="text-gray-600 pt-2">
                        Graded by: {selectedSubmission.gradedBy?.name || 'N/A'}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <div>Select a submission to view details and grade</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
