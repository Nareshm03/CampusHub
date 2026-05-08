'use client';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon, WifiIcon } from '@heroicons/react/24/outline';

function isNetworkError(error) {
  return (
    error?.message?.includes('Network Error') ||
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('ERR_NETWORK') ||
    error?.code === 'ERR_NETWORK' ||
    !navigator.onLine
  );
}

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const networkError = isNetworkError(error);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {networkError ? (
            <WifiIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          ) : (
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          )}
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {networkError ? 'Cannot connect to server' : 'Something went wrong'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {networkError
              ? 'The backend server may be down or you have lost internet connection. Please check your connection and try again.'
              : 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={reset}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    </div>
  );
}
