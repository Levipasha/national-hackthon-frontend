'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface SocketContextType {
  socket: Socket | null;
  toasts: Toast[];
  addToast: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  removeToast: (id: string) => void;
  notificationsCount: number;
  triggerRefreshNotifications: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefreshNotifications = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const addToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch unread notifications count
  useEffect(() => {
    if (!user) {
      setNotificationsCount(0);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('codesprint_token');
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/notifications', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const list = await res.json();
          // Count unread
          const unread = list.filter((n: any) => !n.readBy.includes(user.id)).length;
          setNotificationsCount(unread);
        }
      } catch (err) {
        console.error('Error fetching notifications feed count:', err);
      }
    };

    fetchNotifications();
  }, [user, refreshTrigger]);

  useEffect(() => {
    // Always connect to Socket server to receive public broadcasts
    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to server');
      
      // If user is logged in, join authenticated rooms
      if (user) {
        socketInstance.emit('join_user_room', user.id);
        
        if (user.teamId) {
          socketInstance.emit('join_team_room', user.teamId);
        }
      }
    });

    // Handle incoming join request for team leader
    socketInstance.on('join_request_received', (data: { teamId: string; message: string }) => {
      addToast('New Team Request', data.message, 'info');
      triggerRefreshNotifications();
    });

    // Handle incoming join response for requester
    socketInstance.on('request_response_received', (data: { teamId: string; status: 'approved' | 'rejected'; message: string }) => {
      addToast(
        data.status === 'approved' ? 'Request Approved!' : 'Request Declined', 
        data.message, 
        data.status === 'approved' ? 'success' : 'warning'
      );
      triggerRefreshNotifications();
    });

    // Handle broadcast notifications from admin
    socketInstance.on('broadcast_received', (data: { title: string; message: string; type?: 'info' | 'success' | 'warning' }) => {
      addToast(data.title, data.message, data.type || 'info');
      triggerRefreshNotifications();
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [user, addToast, triggerRefreshNotifications]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        toasts,
        addToast,
        removeToast,
        notificationsCount,
        triggerRefreshNotifications
      }}
    >
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-md shadow-2xl flex flex-col gap-1 transition-all duration-300 transform translate-x-0 animate-[slideIn_0.3s_ease-out] ${
              toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-100 shadow-emerald-950/40'
                : toast.type === 'warning'
                ? 'bg-amber-950/80 border-amber-500/30 text-amber-100 shadow-amber-950/40'
                : 'bg-[#181829]/90 border-purple-500/30 text-purple-100 shadow-purple-950/40'
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <span className="font-bold text-sm tracking-wide uppercase">{toast.title}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">{toast.message}</p>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
