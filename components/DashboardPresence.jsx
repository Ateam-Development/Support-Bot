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

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                lastActivity = Date.now();
                setUserPresence(user.uid, true).catch(() => {});
            } else {
                setUserPresence(user.uid, false).catch(() => {});
            }
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Function to update presence
        const updatePresence = () => {
            if (document.visibilityState === 'visible' && Date.now() - lastActivity < 90 * 1000) {
                setUserPresence(user.uid, true).catch(err =>
                    console.error('Failed to update presence heartbeat:', err)
                );
            }
        };

        // Initial update
        updatePresence();

        // Heartbeat every 20 seconds to keep presence fresh
        const intervalId = setInterval(updatePresence, 20 * 1000);

        // Cleanup on unmount
        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            document.removeEventListener('visibilitychange', handleVisibilityChange);

            clearInterval(intervalId);
            setUserPresence(user.uid, false).catch(() => {});
        };
    }, [user]);

    return null;
}
