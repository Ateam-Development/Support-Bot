import { db } from './firebase-config';
import { collection, query, where, limit, onSnapshot, orderBy } from 'firebase/firestore';

/**
 * Subscribe to conversations for real-time updates (Client-side Firestore)
 * Replaces the server-side version in lib/db.js to avoid firebase-admin dependency in client components
 * 
 * @param {string} chatbotId - The ID of the chatbot to subscribe to
 * @param {function} callback - Function specifically called with the list of conversations
 * @param {number} limitCount - Max number of conversations to fetch
 * @returns {function} - Unsubscribe function
 */
export function subscribeToConversations(chatbotId, callback, limitCount = 50) {
    if (!chatbotId) return () => { };

    const conversationsRef = collection(db, 'conversations');

    // Note: Ideally we should use orderBy('updatedAt', 'desc') but that requires a composite index
    // For now, we'll fetch and sort client-side to match the server-side behavior behavior
    // and avoid "index not found" errors until the index is created.
    const q = query(
        conversationsRef,
        where('chatbotId', '==', chatbotId),
        limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const conversations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Ensure timestamps are handled safely whether they are Firestore Timestamps or strings/numbers
            updatedAtMillis: doc.data().updatedAt?.toMillis ? doc.data().updatedAt.toMillis() : (new Date(doc.data().updatedAt || 0).getTime())
        }));

        // Client-side sort by updatedAt desc
        conversations.sort((a, b) => {
            return b.updatedAtMillis - a.updatedAtMillis;
        });

        callback(conversations);
    }, (error) => {
        console.error("Error subscribing to conversations (client):", error);
    });

    return unsubscribe;
}
