'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { setUserPresence } from '@/lib/firebase-realtime';

export default function DashboardPresence() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        let lastActivity = Date.now();

        // Activity listeners
        const handleActivity = () => {
            lastActivity = Date.now();
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity);

        // Function to update presence
        const updatePresence = () => {
            // Only update presence if active within last minute
            if (Date.now() - lastActivity < 60 * 1000) {
                setUserPresence(user.uid, true).catch(err =>
                    console.error('Failed to update presence heartbeat:', err)
                );
            } else {
                // If inactive for > 1 min, we stop sending heartbeat (or explicitly set offline - optional)
                // For now, letting the heartbeat expire is safer as it handles network issues same as idle
                console.log('[Presence] User idle, skipping heartbeat');
            }
        };

        // Initial update
        updatePresence();

        // Heartbeat every minute
        // This ensures 'lastSeen' is updated regularly so the backend knows we are active
        const intervalId = setInterval(updatePresence, 60 * 1000);

        // Cleanup on unmount
        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity);

            clearInterval(intervalId);
            // Attempt to set offline when leaving
            // Note: This might not always fire on tab close, but the heartbeat timeout 
            // in the backend (3 mins) covers those cases.
            setUserPresence(user.uid, false).catch(() => { });
        };
    }, [user]);

    return null;
}
