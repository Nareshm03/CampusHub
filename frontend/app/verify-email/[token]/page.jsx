'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/axios';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function VerifyEmail() {
  const [message, setMessage] = useState('Verifying your email...');
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        await api.get(`/auth/verifyemail/${params.token}`);
        setMessage('Email verified successfully! You can now log in.');
        setIsVerified(true);
      } catch (error) {
        setMessage(error.response?.data?.error || 'Email verification failed');
        setIsVerified(false);
      } finally {
        setLoading(false);
      }
    };

    if (params.token) {
      verifyEmail();
    }
  }, [params.token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-6 text-center">
        <h2 className="text-2xl font-bold mb-6">Email Verification</h2>
        
        <div className={`p-4 rounded mb-6 ${
          loading ? 'bg-blue-100 text-blue-700' :
          isVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>

        {!loading && (
          <Button 
            onClick={() => router.push('/login')}
            className="w-full"
          >
            Go to Login
          </Button>
        )}
      </Card>
    </div>
  );
}