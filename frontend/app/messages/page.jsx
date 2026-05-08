'use client';

import { Suspense } from 'react';
import ChatInterface from '@/components/ChatInterface';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { SocketProvider } from '@/context/SocketContext';

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <SocketProvider>
        <Suspense fallback={<LoadingSkeleton />}>
          <ChatInterface />
        </Suspense>
      </SocketProvider>
    </ProtectedRoute>
  );
}
