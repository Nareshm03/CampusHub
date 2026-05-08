'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from '@/lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Input from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Calendar, FileText, Users, Upload, Trash2, Eye, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HomeworkPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [homework, setHomework] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: '',
    dueDate: '',
    totalPoints: 100,
    allowLateSubmission: false,
    latePenaltyPercentage: 10,
    latePenaltyPerDay: true,
    maxLateDays: 3,
    instructions: '',
    enablePlagiarismCheck: true,
    plagiarismThreshold: 30
  });
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchHomework();
    fetchCourses();
  }, []);

  const fetchHomework = async () => {
    try {
      const response = await axios.get('/api/homework');
      setHomework(response.data.data);
    } catch (err) {
      setError('Failed to fetch homework');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/courses');
      setCourses(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch courses');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    setAttachments(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });

      attachments.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      await axios.post('/api/homework', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Homework created successfully');
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        course: '',
        dueDate: '',
        totalPoints: 100,
        allowLateSubmission: false,
        latePenaltyPercentage: 10,
        latePenaltyPerDay: true,
        maxLateDays: 3,
        instructions: '',
        enablePlagiarismCheck: true,
        plagiarismThreshold: 30
      });
      setAttachments([]);
      fetchHomework();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create homework');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this homework?')) return;

    try {
      await axios.delete(`/api/homework/${id}`);
      setSuccess('Homework deleted successfully');
      fetchHomework();
    } catch (err) {
      setError('Failed to delete homework');
    }
  };

  const viewSubmissions = (id) => {
    router.push(`/homework/${id}/submissions`);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDate) => {
    return new Date() > new Date(dueDate);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Homework Management</h1>
        {user?.role === 'faculty' && (
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Homework
          </Button>
        )}
      </div>

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

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Homework</CardTitle>
            <CardDescription>Fill in the details to create a new homework assignment</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="course">Course</Label>
                  <select
                    id="course"
                    name="course"
                    value={formData.course}
                    onChange={handleInputChange}
                    className="w-full border rounded-md p-2"
                    required
                  >
                    <option value="">Select Course</option>
                    {courses.map(course => (
                      <option key={course._id} value={course._id}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    type="datetime-local"
                    id="dueDate"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="totalPoints">Total Points</Label>
                  <Input
                    type="number"
                    id="totalPoints"
                    name="totalPoints"
                    value={formData.totalPoints}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="border p-4 rounded-md space-y-3">
                <h3 className="font-semibold">Late Submission Settings</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowLateSubmission"
                    name="allowLateSubmission"
                    checked={formData.allowLateSubmission}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <Label htmlFor="allowLateSubmission">Allow Late Submissions</Label>
                </div>

                {formData.allowLateSubmission && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="latePenaltyPercentage">Penalty %</Label>
                        <Input
                          type="number"
                          id="latePenaltyPercentage"
                          name="latePenaltyPercentage"
                          value={formData.latePenaltyPercentage}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxLateDays">Max Late Days</Label>
                        <Input
                          type="number"
                          id="maxLateDays"
                          name="maxLateDays"
                          value={formData.maxLateDays}
                          onChange={handleInputChange}
                          min="1"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="latePenaltyPerDay"
                          name="latePenaltyPerDay"
                          checked={formData.latePenaltyPerDay}
                          onChange={handleInputChange}
                          className="rounded mr-2"
                        />
                        <Label htmlFor="latePenaltyPerDay">Penalty Per Day</Label>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="border p-4 rounded-md space-y-3">
                <h3 className="font-semibold">Plagiarism Detection</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enablePlagiarismCheck"
                    name="enablePlagiarismCheck"
                    checked={formData.enablePlagiarismCheck}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <Label htmlFor="enablePlagiarismCheck">Enable Plagiarism Check</Label>
                </div>

                {formData.enablePlagiarismCheck && (
                  <div>
                    <Label htmlFor="plagiarismThreshold">Threshold % (Flag if above)</Label>
                    <Input
                      type="number"
                      id="plagiarismThreshold"
                      name="plagiarismThreshold"
                      value={formData.plagiarismThreshold}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="attachments">Attachments (Optional)</Label>
                <Input
                  type="file"
                  id="attachments"
                  multiple
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {attachments.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    {attachments.length} file(s) selected
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Homework</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {homework.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No homework assignments found
            </CardContent>
          </Card>
        ) : (
          homework.map(hw => (
            <Card key={hw._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {hw.title}
                      {isOverdue(hw.dueDate) && (
                        <Badge variant="destructive">Overdue</Badge>
                      )}
                      {hw.enablePlagiarismCheck && (
                        <Badge variant="secondary">Plagiarism Check</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {hw.course?.name} ({hw.course?.code})
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {user?.role === 'faculty' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => viewSubmissions(hw._id)}>
                          <Users className="h-4 w-4 mr-1" />
                          Submissions ({hw.submissionCount})
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => router.push(`/homework/${hw._id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(hw._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{hw.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Due Date:</span>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      {formatDate(hw.dueDate)}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold">Total Points:</span>
                    <div className="text-gray-600">{hw.totalPoints}</div>
                  </div>
                  <div>
                    <span className="font-semibold">Late Submission:</span>
                    <div className="text-gray-600">
                      {hw.allowLateSubmission ? `Yes (${hw.latePenaltyPercentage}% penalty)` : 'No'}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold">Attachments:</span>
                    <div className="text-gray-600">{hw.attachments?.length || 0} files</div>
                  </div>
                </div>
                {user?.role === 'student' && (
                  <div className="mt-4">
                    <Button onClick={() => router.push(`/homework/${hw._id}`)}>
                      <FileText className="h-4 w-4 mr-2" />
                      View & Submit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
