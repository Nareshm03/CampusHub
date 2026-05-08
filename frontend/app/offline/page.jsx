'use client';
import { useState, useEffect } from 'react';
import { WifiIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Button from '../../components/ui/Button';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <WifiIcon className="w-8 h-8 text-gray-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          You're Offline
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Check your internet connection and try again. Some cached content may still be available.
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={handleRetry} 
            disabled={!isOnline}
            className="w-full"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            {isOnline ? 'Retry' : 'Still Offline'}
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={() => window.history.back()}
            className="w-full"
          >
            Go Back
          </Button>
        </div>
        
        <div className={`mt-6 p-3 rounded-lg ${
          isOnline 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          <p className="text-sm font-medium">
            Status: {isOnline ? 'Back Online!' : 'Offline'}
          </p>
        </div>
      </div>
    </div>
  );
}