'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import api from '../../lib/axios';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // If a session already exists, send the user to their role dashboard.
  // Wait for auth initialization to finish so we don't bounce a still-
  // hydrating user (which would cause a redirect loop).
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      router.replace(`/dashboard/${user.role.toLowerCase()}`);
    }
  }, [user, authLoading, router]);

  const [resendLoading, setResendLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendLoading(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setShowResend(false);
      toast.success('Verification email sent. Please check your inbox.');
    } catch (err) {
      toast.error('Could not send verification email. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success('Login successful!');
        router.push(`/dashboard/${result.role.toLowerCase()}`);
      }
    } catch (error) {
      const data = error.response?.data;
      if (data?.error && String(data.error).includes('Email verification required')) {
        setShowResend(true);
        toast.error(data.error);
      } else {
        toast.error(data?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="CampusHub"
                className="h-16 w-auto object-contain"
                style={{ background: 'transparent' }}
              />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Welcome Back</h1>
            <p className="text-gray-500 text-sm">Sign in to your CampusHub account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1.5">Email Address</label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-gray-700 text-sm font-medium">Password</label>
                <Link href="/forgot-password" className="text-primary-600 hover:text-primary-700 text-xs transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white font-medium py-2.5 rounded-lg hover:bg-primary-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          {showResend && (
            <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                Your email address needs to be verified before you can sign in.
              </p>
              <form onSubmit={handleResend} className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full sm:w-auto bg-primary-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {resendLoading ? 'Sending...' : 'Resend verification email'}
                </button>
              </form>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Check your inbox (and spam folder) for the verification link.
              </p>
            </div>
          )}

          <p className="text-center text-gray-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary-600 font-medium hover:underline transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
