import { getRealtimeDb, admin } from './firebase-admin';

/**
 * Server-side Realtime Database writes.
 * Uses the Admin SDK so writes are not blocked by database rules
 * (the client SDK on the server is unauthenticated and gets "Permission denied").
 */
export async function addRealtimeMessage(conversationId, message) {
    const db = getRealtimeDb();
    const ref = db.ref(`conversations/${conversationId}/messages`).push();

    // RTDB rejects undefined values
    const data = JSON.parse(JSON.stringify({
        ...message,
        id: ref.key,
        timestamp: message.timestamp || new Date().toISOString()
    }));
    data.createdAt = admin.database.ServerValue.TIMESTAMP;

    await Promise.all([
        ref.set(data),
        db.ref(`conversations/${conversationId}/metadata`).update({
            lastUpdated: admin.database.ServerValue.TIMESTAMP,
            lastMessageType: message.type || null,
            lastMessageContent: (message.content || '').substring(0, 100)
        })
    ]);

    return ref.key;
}
