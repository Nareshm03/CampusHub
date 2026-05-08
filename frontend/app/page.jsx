'use client';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        const role = user.role.toLowerCase();
        router.push(`/dashboard/${role}`);
      }
    }
  }, [user, loading, router]);

  return <div className="loading">Redirecting...</div>;
}