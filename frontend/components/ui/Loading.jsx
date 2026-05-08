'use client';
import { motion } from 'framer-motion';

// Global loading component
export const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <motion.div
        className={`${sizes[size]} border-2 border-primary-200 border-t-primary-600 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      {text && <span className="text-gray-600 dark:text-gray-400">{text}</span>}
    </div>
  );
};

// Skeleton loader for tables
export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// Card skeleton
export const CardSkeleton = () => (
  <div className="p-6 border rounded-lg space-y-4">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4" />
  </div>
);

// Page loading overlay
export const PageLoader = ({ message = 'Loading page...' }) => (
  <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">{message}</p>
    </div>
  </div>
);

// Button loading state
export const LoadingButton = ({ loading, children, ...props }) => (
  <button {...props} disabled={loading || props.disabled}>
    {loading ? (
      <div className="flex items-center gap-2">
        <LoadingSpinner size="sm" text="" />
        <span>Loading...</span>
      </div>
    ) : children}
  </button>
);