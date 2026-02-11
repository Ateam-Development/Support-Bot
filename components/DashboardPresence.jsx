'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { setUserPresence } from '@/lib/firebase-realtime';

export default function DashboardPresence() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        // Function to update presence
        const updatePresence = () => {
            setUserPresence(user.uid, true).catch(err =>
                console.error('Failed to update presence heartbeat:', err)
            );
        };

        // Initial update
        updatePresence();

        // Heartbeat every minute
        // This ensures 'lastSeen' is updated regularly so the backend knows we are active
        const intervalId = setInterval(updatePresence, 60 * 1000);

        // Cleanup on unmount
        return () => {
            clearInterval(intervalId);
            // Attempt to set offline when leaving
            // Note: This might not always fire on tab close, but the heartbeat timeout 
            // in the backend (5 mins) covers those cases.
            setUserPresence(user.uid, false).catch(() => { });
        };
    }, [user]);

    return null;
}
