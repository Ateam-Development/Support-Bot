import { getDatabase, ref, push, set, onValue, off, serverTimestamp, update } from 'firebase/database';
import app from './firebase-config';

/**
 * Firebase Realtime Database helper for real-time chat functionality
 */

let database = null;

/**
 * Get Firebase Realtime Database instance
 */
export function getRealtimeDB() {
    if (!database) {
        database = getDatabase(app);
    }
    return database;
}

/**
 * Database paths structure:
 * /conversations/{conversationId}/messages/{messageId}
 * /conversations/{conversationId}/typing/{userId}
 * /conversations/{conversationId}/metadata
 * /presence/{userId}
 */

export const REALTIME_PATHS = {
    conversationMessages: (conversationId) => `conversations/${conversationId}/messages`,
    conversationTyping: (conversationId) => `conversations/${conversationId}/typing`,
    conversationMetadata: (conversationId) => `conversations/${conversationId}/metadata`,
    userPresence: (userId) => `presence/${userId}`,
};

/**
 * Add a message to Realtime Database
 */
export async function addRealtimeMessage(conversationId, message) {
    const db = getRealtimeDB();
    const messagesRef = ref(db, REALTIME_PATHS.conversationMessages(conversationId));

    // Use existing message ID or generate a new one
    const messageId = message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageRef = message.id ? ref(db, `${REALTIME_PATHS.conversationMessages(conversationId)}/${message.id}`) : push(messagesRef);

    const messageData = {
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
        id: messageId,
        createdAt: serverTimestamp()
    };

    await set(messageRef, messageData);

    // Update metadata
    const metadataRef = ref(db, REALTIME_PATHS.conversationMetadata(conversationId));
    await update(metadataRef, {
        lastUpdated: serverTimestamp(),
        lastMessageType: message.type,
        lastMessageContent: message.content?.substring(0, 100) // Preview
    });

    return messageId;
}

/**
 * Subscribe to messages for a conversation
 */
export function subscribeToMessages(conversationId, callback) {
    const db = getRealtimeDB();
    const messagesRef = ref(db, REALTIME_PATHS.conversationMessages(conversationId));

    onValue(messagesRef, (snapshot) => {
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        callback(messages);
    });

    return () => off(messagesRef);
}

/**
 * Set typing indicator
 */
export async function setTypingIndicator(conversationId, userId, isTyping) {
    const db = getRealtimeDB();
    const typingRef = ref(db, `${REALTIME_PATHS.conversationTyping(conversationId)}/${userId}`);

    if (isTyping) {
        await set(typingRef, {
            typing: true,
            timestamp: serverTimestamp()
        });
    } else {
        await set(typingRef, null);
    }
}

/**
 * Subscribe to typing indicators
 */
export function subscribeToTyping(conversationId, callback) {
    const db = getRealtimeDB();
    const typingRef = ref(db, REALTIME_PATHS.conversationTyping(conversationId));

    onValue(typingRef, (snapshot) => {
        const typingUsers = [];
        snapshot.forEach((childSnapshot) => {
            if (childSnapshot.val()?.typing) {
                typingUsers.push(childSnapshot.key);
            }
        });
        callback(typingUsers);
    });

    return () => off(typingRef);
}

/**
 * Set user presence
 */
export async function setUserPresence(userId, online) {
    const db = getRealtimeDB();
    const presenceRef = ref(db, REALTIME_PATHS.userPresence(userId));

    await set(presenceRef, {
        online,
        lastSeen: serverTimestamp()
    });
}

/**
 * Subscribe to user presence
 */
export function subscribeToPresence(userId, callback) {
    const db = getRealtimeDB();
    const presenceRef = ref(db, REALTIME_PATHS.userPresence(userId));

    onValue(presenceRef, (snapshot) => {
        callback(snapshot.val());
    });

    return () => off(presenceRef);
}

/**
 * Update conversation metadata (unread count, etc.)
 */
export async function updateConversationMetadata(conversationId, metadata) {
    const db = getRealtimeDB();
    const metadataRef = ref(db, REALTIME_PATHS.conversationMetadata(conversationId));

    await update(metadataRef, {
        ...metadata,
        lastUpdated: serverTimestamp()
    });
}

/**
 * Subscribe to conversation metadata
 */
export function subscribeToMetadata(conversationId, callback) {
    const db = getRealtimeDB();
    const metadataRef = ref(db, REALTIME_PATHS.conversationMetadata(conversationId));

    onValue(metadataRef, (snapshot) => {
        callback(snapshot.val());
    });

    return () => off(metadataRef);
}

/**
 * Check user status (Server-side)
 * Returns { online: boolean, lastSeen: number }
 */
export async function checkUserStatus(userId) {
    const db = getRealtimeDB();
    const presenceRef = ref(db, REALTIME_PATHS.userPresence(userId));

    return new Promise((resolve) => {
        // Use once() to get current value without subscribing
        onValue(presenceRef, (snapshot) => {
            const data = snapshot.val();
            resolve(data || { online: false, lastSeen: 0 });
        }, { onlyOnce: true });
    });
}
