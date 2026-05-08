import { cn } from '@/lib/utils';

const Alert = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100',
    destructive: 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100',
    warning: 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
    success: 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800 text-green-900 dark:text-green-100',
    info: 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-100'
  };

  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4',
        variants[variant],
        className
      )}
    >
      {children}
    </div>
  );
};

const AlertTitle = ({ children, className = '' }) => {
  return (
    <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)}>
      {children}
    </h5>
  );
};

const AlertDescription = ({ children, className = '' }) => {
  return (
    <div className={cn('text-sm [&_p]:leading-relaxed', className)}>
      {children}
    </div>
  );
};

export { Alert, AlertTitle, AlertDescription };
