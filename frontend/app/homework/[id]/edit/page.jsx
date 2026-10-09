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
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function HomeworkEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    totalPoints: 100,
    allowLateSubmission: false,
    latePenaltyPercentage: 10,
    instructions: ''
  });

  useEffect(() => {
    fetchHomework();
  }, [id]);

  const toInputDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 16);
  };

  const fetchHomework = async () => {
    try {
      const response = await axios.get(`/homework/${id}`);
      const hw = response.data.data;
      setFormData({
        title: hw.title || '',
        description: hw.description || '',
        dueDate: toInputDate(hw.dueDate),
        totalPoints: hw.totalPoints ?? 100,
        allowLateSubmission: !!hw.allowLateSubmission,
        latePenaltyPercentage: hw.latePenaltyPercentage ?? 10,
        instructions: hw.instructions || ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch homework details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title.trim() || !formData.description.trim() || !formData.dueDate) {
      setError('Title, description and due date are required');
      return;
    }

    try {
      setSaving(true);
      await axios.put(`/homework/${id}`, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        dueDate: formData.dueDate,
        totalPoints: Number(formData.totalPoints),
        allowLateSubmission: formData.allowLateSubmission,
        latePenaltyPercentage: Number(formData.latePenaltyPercentage),
        instructions: formData.instructions
      });
      setSuccess('Homework updated successfully');
      setTimeout(() => router.push('/homework'), 800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update homework');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Loading homework...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && user.role !== 'FACULTY' && user.role !== 'ADMIN') {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertDescription>Only faculty can edit homework assignments.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit Homework</CardTitle>
          <CardDescription>Update the assignment details below</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" value={formData.title} onChange={handleInputChange} required />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input id="dueDate" name="dueDate" type="datetime-local" value={formData.dueDate} onChange={handleInputChange} required />
              </div>
              <div>
                <Label htmlFor="totalPoints">Total Points</Label>
                <Input id="totalPoints" name="totalPoints" type="number" min="1" value={formData.totalPoints} onChange={handleInputChange} />
              </div>
            </div>
            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea id="instructions" name="instructions" value={formData.instructions} onChange={handleInputChange} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="allowLateSubmission"
                name="allowLateSubmission"
                type="checkbox"
                checked={formData.allowLateSubmission}
                onChange={handleInputChange}
              />
              <Label htmlFor="allowLateSubmission">Allow late submission</Label>
            </div>
            {formData.allowLateSubmission && (
              <div>
                <Label htmlFor="latePenaltyPercentage">Late Penalty %</Label>
                <Input id="latePenaltyPercentage" name="latePenaltyPercentage" type="number" min="0" max="100" value={formData.latePenaltyPercentage} onChange={handleInputChange} />
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/homework')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
