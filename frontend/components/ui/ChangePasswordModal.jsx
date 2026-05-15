'use client';
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../../lib/axios';
import { toast } from 'sonner';

/**
 * ChangePasswordModal
 * @param {boolean}  isOpen       - controls visibility
 * @param {Function} onClose      - called when modal closes
 * @param {string}   [userId]     - if provided, admin-mode: changes that user's password without current password
 * @param {string}   [userName]   - display name for the target user (admin mode)
 * @param {boolean}  [adminMode]  - shortcut flag; auto-detected when userId is provided
 */
export default function ChangePasswordModal({ isOpen, onClose, userId, userName }) {
  const isAdminMode = !!userId;

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [show, setShow] = useState({ current: false, newPw: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const toggle = useCallback((field) => {
    setShow(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const handleFieldChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const validate = () => {
    const errs = {};
    if (!isAdminMode && !form.currentPassword) errs.currentPassword = 'Current password is required';
    if (!form.newPassword) errs.newPassword = 'New password is required';
    else if (form.newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters';
    else if (!/[a-z]/.test(form.newPassword)) errs.newPassword = 'Password must contain at least one lowercase letter';
    else if (!/[0-9]/.test(form.newPassword)) errs.newPassword = 'Password must contain at least one number';
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your new password';
    else if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (isAdminMode) {
        await api.put(`/users/${userId}/change-password`, { newPassword: form.newPassword });
        toast.success(`Password changed for ${userName || 'user'}`);
      } else {
        await api.put('/auth/changepassword', {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword
        });
        toast.success('Password changed successfully');
      }
      handleClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to change password';
      toast.error(msg);
      if (msg.toLowerCase().includes('current')) {
        setErrors(prev => ({ ...prev, currentPassword: msg }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
    setShow({ current: false, newPw: false, confirm: false });
    onClose();
  };

  const getStrength = (pw) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++; // Both cases
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = getStrength(form.newPassword);
  const strengthLabel = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'][strength];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Header */}
            <div className={`px-6 py-5 border-b border-gray-100 dark:border-gray-800 ${
              isAdminMode
                ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20'
                : 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isAdminMode ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
                    <KeyIcon className={`w-5 h-5 ${isAdminMode ? 'text-purple-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {isAdminMode ? 'Reset User Password' : 'Change Password'}
                    </h2>
                    {isAdminMode && userName && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                        for {userName}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {isAdminMode && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <ShieldCheckIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    As admin, you can set a new password without knowing the current one.
                    The user will need to use this new password to log in.
                  </p>
                </div>
              )}

              {!isAdminMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={show.current ? 'text' : 'password'}
                      value={form.currentPassword}
                      onChange={e => handleFieldChange('currentPassword', e.target.value)}
                      placeholder="Enter your current password"
                      className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors ${
                        errors.currentPassword
                          ? 'border-red-400 focus:ring-red-400'
                          : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                      } focus:outline-none focus:ring-2 focus:border-transparent`}
                    />
                    <button
                      type="button"
                      onClick={() => toggle('current')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {show.current ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-3 h-3" /> {errors.currentPassword}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={show.newPw ? 'text' : 'password'}
                    value={form.newPassword}
                    onChange={e => handleFieldChange('newPassword', e.target.value)}
                    placeholder="Min. 8 chars, lowercase + number required"
                    className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors ${
                      errors.newPassword
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                    } focus:outline-none focus:ring-2 focus:border-transparent`}
                  />
                  <button
                    type="button"
                    onClick={() => toggle('newPw')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {show.newPw ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3 h-3" /> {errors.newPassword}
                  </p>
                )}
              </div>

              {/* Strength meter */}
              {form.newPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= strength ? strengthColor : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    strength <= 1 ? 'text-red-500' : strength <= 2 ? 'text-orange-500' :
                    strength <= 3 ? 'text-yellow-500' : strength <= 4 ? 'text-blue-500' : 'text-green-500'
                  }`}>{strengthLabel}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={show.confirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={e => handleFieldChange('confirmPassword', e.target.value)}
                    placeholder="Re-enter new password"
                    className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors ${
                      errors.confirmPassword
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                    } focus:outline-none focus:ring-2 focus:border-transparent`}
                  />
                  <button
                    type="button"
                    onClick={() => toggle('confirm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {show.confirm ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3 h-3" /> {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    isAdminMode
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                  } disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <KeyIcon className="w-4 h-4" />
                      {isAdminMode ? 'Reset Password' : 'Change Password'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
