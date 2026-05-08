'use client';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { cn } from '@/lib/utils';

const Badge = ({
  children,
  variant = 'info',
  size = 'md',
  className,
  ...props
}) => {
  const variants = {
    default: 'bg-primary text-white',
    success: 'badge-success bg-green-500 text-white',
    warning: 'badge-warning bg-yellow-500 text-white',
    danger: 'badge-danger bg-red-500 text-white',
    destructive: 'bg-red-500 text-white',
    info: 'badge-info bg-blue-500 text-white',
    secondary: 'bg-gray-500 text-white',
    outline: 'border border-gray-300 text-gray-700'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        'badge inline-flex items-center rounded-full font-semibold transition-colors',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </motion.span>
  );
};

export { Badge };
export default Badge;
