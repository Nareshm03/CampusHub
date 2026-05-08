'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import axios from '@/lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Input from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle, Download, Calendar, Clock } from 'lucide-react';

export default function HomeworkDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [homework, setHomework] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const [textContent, setTextContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchHomework();
    fetchMySubmission();
  }, [id]);

  const fetchHomework = async () => {
    try {
      const response = await axios.get(`/api/homework/${id}`);
      setHomework(response.data.data);
    } catch (err) {
      setError('Failed to fetch homework details');
    } finally {
      setLoading(false);
    }
  };

  const fetchMySubmission = async () => {
    try {
      const response = await axios.get('/api/homework/submissions/my-submissions');
      const mySubmission = response.data.data.find(
        sub => sub.homework._id === id
      );
      if (mySubmission) {
        setSubmission(mySubmission);
      }
    } catch (err) {
      console.error('Failed to fetch submission');
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Validate file types if specified
    if (homework?.allowedFileTypes && homework.allowedFileTypes.length > 0) {
      const invalidFiles = selectedFiles.filter(file => {
        const extension = file.name.split('.').pop().toLowerCase();
        return !homework.allowedFileTypes.includes(extension);
      });
      
      if (invalidFiles.length > 0) {
        setError(`Invalid file types. Allowed: ${homework.allowedFileTypes.join(', ')}`);
        return;
      }
    }
    
    // Validate file size
    const maxSize = homework?.maxFileSize || 10485760; // 10MB default
    const oversizedFiles = selectedFiles.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the maximum size of ${maxSize / 1048576}MB`);
      return;
    }
    
    setFiles(selectedFiles);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('textContent', textContent);
      
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await axios.post(
        `/api/homework/${id}/submit`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setSuccess('Homework submitted successfully!');
      setSubmission(response.data.data);
      setFiles([]);
      setTextContent('');
      
      // Show plagiarism score if checked
      if (response.data.data.isPlagiarismChecked) {
        const score = response.data.data.plagiarismScore;
        if (score > 0) {
          setError(`Plagiarism check: ${score}% similarity detected`);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit homework');
    } finally {
      setSubmitting(false);
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

  const isOverdue = () => {
    return homework && new Date() > new Date(homework.dueDate);
  };

  const canSubmit = () => {
    if (!homework) return false;
    if (submission && !submission.resubmissionAllowed) return false;
    if (isOverdue() && !homework.allowLateSubmission) return false;
    return true;
  };

  const getTimeRemaining = () => {
    if (!homework) return '';
    const now = new Date();
    const due = new Date(homework.dueDate);
    const diff = due - now;
    
    if (diff < 0) return 'Overdue';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} days ${hours} hours remaining`;
    return `${hours} hours remaining`;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!homework) {
    return <div className="container mx-auto p-6">Homework not found</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        ← Back
      </Button>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Homework Details */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                {homework.title}
                {isOverdue() && <Badge variant="destructive">Overdue</Badge>}
              </CardTitle>
              <CardDescription className="text-lg mt-1">
                {homework.course?.name} ({homework.course?.code})
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {homework.totalPoints}
              </div>
              <div className="text-sm text-gray-500">points</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-gray-700">{homework.description}</p>
          </div>

          {homework.instructions && (
            <div>
              <h3 className="font-semibold mb-2">Instructions</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{homework.instructions}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">Due Date:</span>
              </div>
              <div className="ml-6">{formatDate(homework.dueDate)}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span className="font-semibold">Time Remaining:</span>
              </div>
              <div className={`ml-6 ${isOverdue() ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                {getTimeRemaining()}
              </div>
            </div>
          </div>

          {homework.allowLateSubmission && (
            <Alert>
              <AlertDescription>
                Late submissions allowed with {homework.latePenaltyPercentage}% penalty
                {homework.latePenaltyPerDay && ' per day'}
                {' '}(max {homework.maxLateDays} days)
              </AlertDescription>
            </Alert>
          )}

          {homework.attachments && homework.attachments.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Attachments</h3>
              <div className="space-y-2">
                {homework.attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    <span>{file.originalName}</span>
                    <Button size="sm" variant="ghost">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submission Status */}
      {submission && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Submission Status
              <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                {submission.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">Submitted:</span>
                <div className="text-gray-600">{formatDate(submission.submittedAt)}</div>
              </div>
              {submission.isLate && (
                <div>
                  <span className="font-semibold text-red-600">Late by:</span>
                  <div className="text-red-600">{submission.daysLate} days</div>
                </div>
              )}
            </div>

            {submission.isPlagiarismChecked && (
              <div>
                <span className="font-semibold">Plagiarism Score:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        submission.plagiarismScore > 50 ? 'bg-red-600' :
                        submission.plagiarismScore > 30 ? 'bg-yellow-600' :
                        'bg-green-600'
                      }`}
                      style={{ width: `${submission.plagiarismScore}%` }}
                    />
                  </div>
                  <span className="font-semibold">{submission.plagiarismScore}%</span>
                </div>
              </div>
            )}

            {submission.status === 'graded' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-semibold">Grade:</span>
                    <div className="text-2xl font-bold text-blue-600">
                      {submission.adjustedGrade || submission.grade}/{homework.totalPoints}
                    </div>
                    {submission.latePenalty > 0 && (
                      <div className="text-sm text-gray-600">
                        (Original: {submission.grade}, Penalty: -{submission.latePenalty}%)
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold">Graded By:</span>
                    <div className="text-gray-600">{submission.gradedBy?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{formatDate(submission.gradedAt)}</div>
                  </div>
                </div>

                {submission.feedback && (
                  <div>
                    <span className="font-semibold">Feedback:</span>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                      {submission.feedback}
                    </div>
                  </div>
                )}
              </>
            )}

            {submission.files && submission.files.length > 0 && (
              <div>
                <span className="font-semibold">Submitted Files:</span>
                <div className="space-y-2 mt-2">
                  {submission.files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" />
                      <span>{file.originalName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submission Form */}
      {canSubmit() && user?.role === 'student' && (
        <Card>
          <CardHeader>
            <CardTitle>
              {submission ? 'Resubmit Homework' : 'Submit Homework'}
            </CardTitle>
            <CardDescription>
              Upload your files and/or provide text content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="textContent">Written Response (Optional)</Label>
                <Textarea
                  id="textContent"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={6}
                  placeholder="Type your response here..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  Text content will be used for plagiarism detection
                </p>
              </div>

              <div>
                <Label htmlFor="files">Upload Files</Label>
                <Input
                  type="file"
                  id="files"
                  multiple
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {homework.allowedFileTypes && homework.allowedFileTypes.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Allowed file types: {homework.allowedFileTypes.join(', ')}
                  </p>
                )}
                {files.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    {files.map((file, i) => (
                      <div key={i}>• {file.name} ({(file.size / 1024).toFixed(2)} KB)</div>
                    ))}
                  </div>
                )}
              </div>

              {isOverdue() && homework.allowLateSubmission && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This submission will be marked as late with a {homework.latePenaltyPercentage}% penalty
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={submitting || (files.length === 0 && !textContent)}>
                <Upload className="h-4 w-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Homework'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {!canSubmit() && user?.role === 'student' && !submission && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {isOverdue() && !homework.allowLateSubmission
              ? 'This homework is overdue and no longer accepts submissions'
              : 'Submissions are currently not allowed'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
