'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getSocketUrl } from '../lib/socketUrl';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, token } = useAuth();
  // Stable primitive dep: the user object identity changes on profile
  // updates, which must not tear down and rebuild the connection.
  const userId = user?.id || user?._id || null;

  useEffect(() => {
    if (token && userId) {
      // Socket.io handshakes at the host root (/socket.io/), not under the
      // /api/v1 API prefix — derive the host from the API base URL.
      const socketInstance = io(getSocketUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'), {
        auth: {
          token: token
        },
        withCredentials: true
      });

      socketInstance.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
        socketInstance.emit('user_status', 'online');
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      socketInstance.on('error', (error) => {
        console.error('Socket error:', error);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.emit('user_status', 'offline');
        socketInstance.disconnect();
        setSocket(null);
        setConnected(false);
      };
    }

    // Logged out (or token cleared): drop any stale socket state so a dead
    // instance is never reused and the next login starts clean.
    setSocket(null);
    setConnected(false);
    return undefined;
  }, [token, userId]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
