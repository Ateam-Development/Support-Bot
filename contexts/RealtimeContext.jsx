"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    subscribeToMessages,
    subscribeToTyping,
    subscribeToPresence,
    subscribeToMetadata,
    setTypingIndicator,
    setUserPresence,
    addRealtimeMessage
} from '@/lib/firebase-realtime';

const RealtimeContext = createContext();

export function RealtimeProvider({ children }) {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Mark as connected when component mounts
        setIsConnected(true);

        return () => {
            setIsConnected(false);
        };
    }, []);

    return (
        <RealtimeContext.Provider value={{
            isConnected,
            subscribeToMessages,
            subscribeToTyping,
            subscribeToPresence,
            subscribeToMetadata,
            setTypingIndicator,
            setUserPresence,
            addRealtimeMessage
        }}>
            {children}
        </RealtimeContext.Provider>
    );
}

export function useRealtime() {
    const context = useContext(RealtimeContext);
    if (!context) {
        throw new Error('useRealtime must be used within RealtimeProvider');
    }
    return context;
}
