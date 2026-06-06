import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

let socket = null;

export const useSocket = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const connected = useRef(false);

  useEffect(() => {
    if (!user || connected.current) return;

    socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      connected.current = true;
      socket.emit('join', user.id);
    });

    socket.on('notification', (data) => {
      toast(data.message, {
        icon: data.type === 'approval' ? '⚠️' : data.type === 'po' ? '✅' : '🔔',
        duration: 5000,
      });
      qc.invalidateQueries(['notifications']);
      qc.invalidateQueries(['dashboard']);
    });

    socket.on('disconnect', () => {
      connected.current = false;
    });

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
        connected.current = false;
      }
    };
  }, [user?.id]);

  return socket;
};
