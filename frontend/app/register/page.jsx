'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AcademicCapIcon, UserIcon, EnvelopeIcon, LockClosedIcon,
  BuildingOfficeIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon, ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import api from '../../lib/axios';

const ROLES = ['STUDENT', 'FACULTY', 'ADMIN', 'PARENT'];

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { label: 'Weak', color: 'bg-red-500' },
    { label: 'Fair', color: 'bg-orange-500' },
    { label: 'Good', color: 'bg-yellow-500' },
    { label: 'Strong', color: 'bg-green-500' },
    { label: 'Very Strong', color: 'bg-emerald-500' },
  ];
  return { score, ...levels[score] };
}

function FieldInput({ label, icon: Icon, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {label}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
          >
            <ExclamationCircleIcon className="w-3.5 h-3.5" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputClass = "w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'STUDENT', department: '', studentUsn: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const strength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);

  const set = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Full name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Enter a valid email';
    if (!formData.password) e.password = 'Password is required';
    else {
      if (formData.password.length < 8) e.password = 'Minimum 8 characters';
      // simple check for at least one uppercase, lowercase, number, special char
      else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
        e.password = 'Must include uppercase, lowercase, number, and special character';
      }
    }
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (formData.role !== 'PARENT' && !formData.department.trim()) e.department = 'Department is required';
    if (formData.role === 'PARENT' && !formData.studentUsn.trim()) e.studentUsn = 'Student USN is required to link your account';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { confirmPassword, studentUsn, ...payload } = formData;
      // For PARENT role: omit department, include studentUsn for post-registration linking
      if (formData.role === 'PARENT') {
        delete payload.department;
      }
      await api.post('/auth/register', payload);
      // If parent, link student after registration
      if (formData.role === 'PARENT' && studentUsn.trim()) {
        try {
          const loginRes = await api.post('/auth/login', { email: formData.email, password: formData.password });
          if (loginRes.data?.token) {
            localStorage.setItem('token', loginRes.data.token);
            await api.post('/parent/link-student', { usn: studentUsn.trim() });
            localStorage.removeItem('token');
          }
        } catch {
          // Non-fatal — parent can link from dashboard
        }
      }
      toast.success('Account created! Please sign in.');
      router.push('/login');
    } catch (error) {
      const data = error.response?.data;
      const msg = data?.message || data?.error || 'Registration failed';
      
      // If there are detailed validation errors, display the first one
      if (data?.errors && data.errors.length > 0) {
        toast.error(data.errors[0].msg || msg);
        setErrors({ api: data.errors[0].msg || msg });
      } else {
        toast.error(msg);
        setErrors({ api: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AcademicCapIcon className="w-9 h-9 text-primary-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Join CampusHub</h1>
          <p className="text-gray-500 text-sm">Create your account to get started</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <AnimatePresence>
            {errors.api && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-5 text-sm"
              >
                <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
                {errors.api}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name + Email row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput label="Full Name" icon={UserIcon} error={errors.name}>
                <input
                  type="text"
                  value={formData.name}
                  onChange={set('name')}
                  className={`${inputClass} ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="John Doe"
                  disabled={loading}
                />
              </FieldInput>

              <FieldInput label="Email Address" icon={EnvelopeIcon} error={errors.email}>
                <input
                  type="email"
                  value={formData.email}
                  onChange={set('email')}
                  className={`${inputClass} ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </FieldInput>
            </div>

            {/* Password */}
            <FieldInput label="Password" icon={LockClosedIcon} error={errors.password}>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={set('password')}
                  className={`${inputClass} pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="Min. 8 characters, complex"
                  disabled={loading}
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {formData.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-700'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{strength.label}</p>
                </div>
              )}
            </FieldInput>

            {/* Confirm Password */}
            <FieldInput label="Confirm Password" icon={LockClosedIcon} error={errors.confirmPassword}>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={set('confirmPassword')}
                  className={`${inputClass} pr-10 ${errors.confirmPassword ? 'border-red-400 focus:ring-red-400' : formData.confirmPassword && formData.confirmPassword === formData.password ? 'border-green-400 focus:ring-green-400' : ''}`}
                  placeholder="Re-enter your password"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" tabIndex={-1}>
                  {showConfirm ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
                {formData.confirmPassword && formData.confirmPassword === formData.password && (
                  <CheckCircleIcon className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
            </FieldInput>

            {/* Role + Department row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput label="Role">
                <select
                  value={formData.role}
                  onChange={set('role')}
                  className={`${inputClass} cursor-pointer`}
                  disabled={loading}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </FieldInput>

              {formData.role !== 'PARENT' ? (
                <FieldInput label="Department" icon={BuildingOfficeIcon} error={errors.department}>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={set('department')}
                    className={`${inputClass} ${errors.department ? 'border-red-400 focus:ring-red-400' : ''}`}
                    placeholder="e.g. Computer Science"
                    disabled={loading}
                  />
                </FieldInput>
              ) : (
                <FieldInput label="Child's USN" icon={AcademicCapIcon} error={errors.studentUsn}>
                  <input
                    type="text"
                    value={formData.studentUsn}
                    onChange={set('studentUsn')}
                    className={`${inputClass} ${errors.studentUsn ? 'border-red-400 focus:ring-red-400' : ''}`}
                    placeholder="e.g. 1RV21CS001"
                    disabled={loading}
                  />
                </FieldInput>
              )}
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
                  Creating Account...
                </>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-600 font-medium hover:underline transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          By registering, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-gray-600">Terms</Link> and{' '}
          <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
