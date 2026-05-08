'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      await api.post('/auth/forgotpassword', { email });
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error.response?.data?.error ||
        'Something went wrong. Please try again.'
      );
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check your inbox</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-1">
            We sent a password reset link to
          </p>
          <p className="font-semibold text-gray-800 dark:text-gray-200 mb-6">{email}</p>
          <p className="text-sm text-gray-400 mb-6">
            The link expires in <strong>10 minutes</strong>. Check your spam folder if you don't see it.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => { setStatus('idle'); setEmail(''); }}
              variant="outline"
              className="w-full"
            >
              Try a different email
            </Button>
            <button
              onClick={() => router.push('/login')}
              className="w-full text-sm text-primary-600 hover:underline"
            >
              Back to Login
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot Password?</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {status === 'error' && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm mb-4">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <Button
            type="submit"
            className="w-full"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-primary-600 hover:underline"
          >
            Back to Login
          </button>
        </div>
      </Card>
    </div>
  );
}
