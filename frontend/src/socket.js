import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:9000';

let socket = null;

const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });
    }
    return socket;
};

export const useSocket = (userId, onNotification) => {
    const handlerRef = useRef(onNotification);
    handlerRef.current = onNotification;

    useEffect(() => {
        if (!userId) return;

        const s = getSocket();

        // Join room initially
        s.emit('join', userId);

        // CRITICAL FIX: Re-join room after reconnect to restore notification delivery
        const onReconnect = () => {
            console.log('[SOCKET] Reconnected — re-joining room:', userId);
            s.emit('join', userId);
        };
        s.on('reconnect', onReconnect);

        const handler = (data) => {
            if (handlerRef.current) handlerRef.current(data);
        };

        s.on('notification', handler);

        return () => {
            s.off('notification', handler);
            s.off('reconnect', onReconnect);
        };
    }, [userId]);
};

export default getSocket;
