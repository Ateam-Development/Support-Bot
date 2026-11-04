import { getAuth, getRealtimeDb } from './firebase-admin';

const ownerEmailCache = new Map();

/**
 * Who gets notification emails for a chatbot.
 * Uses the chatbot's notificationEmails; falls back to the owner's account email
 * so alerts still arrive when nothing is configured.
 */
export async function getNotificationRecipients(chatbot) {
    if (chatbot?.notificationEmails && chatbot.notificationEmails.length > 0) {
        return chatbot.notificationEmails;
    }
    if (!chatbot?.userId) return [];

    if (ownerEmailCache.has(chatbot.userId)) {
        return [ownerEmailCache.get(chatbot.userId)];
    }

    try {
        const owner = await getAuth().getUser(chatbot.userId);
        if (owner.email) {
            ownerEmailCache.set(chatbot.userId, owner.email);
            return [owner.email];
        }
    } catch (err) {
        console.warn('[NOTIFY] Could not resolve owner email:', err.message);
    }
    return [];
}

/**
 * True when the owner has the dashboard open (heartbeat within the last 60s).
 */
export async function isOwnerOnDashboard(userId) {
    if (!userId) return false;
    try {
        const snap = await getRealtimeDb().ref(`presence/${userId}`).once('value');
        const status = snap.val();
        if (!status) return false;
        return status.online === true && Date.now() - (status.lastSeen || 0) < 60 * 1000;
    } catch (err) {
        console.warn('[PRESENCE-CHECK] Error checking dashboard presence:', err.message);
        return false;
    }
}

export function appUrl(path = '') {
    return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${path}`;
}

export function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
