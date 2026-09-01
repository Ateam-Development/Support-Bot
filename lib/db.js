import { getFirestore, admin } from './firebase-admin';

/**
 * Database helper functions for Firestore operations
 */

// ==================== Chatbot Operations ====================

/**
 * Create a new chatbot
 */
async function createChatbot(userId, chatbotData) {
    const firestore = getFirestore();
    const chatbotRef = firestore.collection('chatbots').doc();

    const chatbot = {
        id: chatbotRef.id,
        userId,
        name: chatbotData.name || 'New Chatbot',
        primaryColor: chatbotData.primaryColor || 'blue',
        welcomeMessage: chatbotData.welcomeMessage || 'Hello! How can I help you today?',
        theme: chatbotData.theme || 'black',
        openaiApiKey: chatbotData.openaiApiKey || '',
        geminiApiKey: chatbotData.geminiApiKey || '',
        systemMessage: chatbotData.systemMessage || 'You are a helpful assistant.',
        model: chatbotData.model || 'gemini',
        disabled: false,
        notificationEmails: chatbotData.notificationEmails || [],
        allowedOrigins: chatbotData.allowedOrigins || [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await chatbotRef.set(chatbot);
    return { ...chatbot, id: chatbotRef.id };
}

/**
 * Get all chatbots for a user
 */
async function getChatbotsByUserId(userId) {
    const firestore = getFirestore();
    const snapshot = await firestore
        .collection('chatbots')
        .where('userId', '==', userId)
        .get();

    const chatbots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return chatbots.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
    });
}

/**
 * Get a specific chatbot by ID
 */
async function getChatbotById(chatbotId) {
    const firestore = getFirestore();
    const doc = await firestore.collection('chatbots').doc(chatbotId).get();

    if (!doc.exists) {
        return null;
    }

    return { id: doc.id, ...doc.data() };
}

/**
 * Update a chatbot
 */
async function updateChatbot(chatbotId, updates) {
    const firestore = getFirestore();
    const chatbotRef = firestore.collection('chatbots').doc(chatbotId);

    await chatbotRef.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updated = await chatbotRef.get();
    return { id: updated.id, ...updated.data() };
}

/**
 * Delete a chatbot and all associated data
 */
async function deleteChatbot(chatbotId) {
    const firestore = getFirestore();

    // Delete chatbot document
    await firestore.collection('chatbots').doc(chatbotId).delete();

    // Delete associated knowledge items
    const knowledgeSnapshot = await firestore
        .collection('knowledge')
        .where('chatbotId', '==', chatbotId)
        .get();

    const knowledgeBatch = firestore.batch();
    knowledgeSnapshot.docs.forEach(doc => {
        knowledgeBatch.delete(doc.ref);
    });
    await knowledgeBatch.commit();

    // Delete associated knowledge chunks
    const chunksSnapshot = await firestore
        .collection('knowledge_chunks')
        .where('chatbotId', '==', chatbotId)
        .get();

    if (!chunksSnapshot.empty) {
        const chunksBatch = firestore.batch();
        chunksSnapshot.docs.forEach(doc => chunksBatch.delete(doc.ref));
        await chunksBatch.commit();
    }

    // Delete associated conversations
    const conversationsSnapshot = await firestore
        .collection('conversations')
        .where('chatbotId', '==', chatbotId)
        .get();

    const conversationsBatch = firestore.batch();
    conversationsSnapshot.docs.forEach(doc => {
        conversationsBatch.delete(doc.ref);
    });
    await conversationsBatch.commit();

    // Delete sections
    const sectionsSnapshot = await firestore
        .collection('sections')
        .where('chatbotId', '==', chatbotId)
        .get();

    if (!sectionsSnapshot.empty) {
        const sectionsBatch = firestore.batch();
        sectionsSnapshot.docs.forEach(doc => sectionsBatch.delete(doc.ref));
        await sectionsBatch.commit();
    }

    // Delete settings & flow
    await firestore.collection('settings').doc(chatbotId).delete();
    await firestore.collection('flows').doc(chatbotId).delete();

    return true;
}

// ==================== Knowledge Operations ====================

/**
 * Add knowledge item to a chatbot
 */
async function addKnowledge(chatbotId, knowledgeData) {
    const firestore = getFirestore();
    const knowledgeRef = firestore.collection('knowledge').doc();

    const knowledge = {
        id: knowledgeRef.id,
        chatbotId,
        type: knowledgeData.type, // 'website', 'file', 'text'
        content: knowledgeData.content,
        metadata: knowledgeData.metadata || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await knowledgeRef.set(knowledge);
    return { ...knowledge, id: knowledgeRef.id };
}

/**
 * Get single knowledge item by ID
 */
async function getKnowledgeById(knowledgeId) {
    const firestore = getFirestore();
    const doc = await firestore.collection('knowledge').doc(knowledgeId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

/**
 * Get all knowledge items for a chatbot
 */
async function getKnowledgeByChatbotId(chatbotId) {
    const firestore = getFirestore();
    const snapshot = await firestore
        .collection('knowledge')
        .where('chatbotId', '==', chatbotId)
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.().toISOString() || data.updatedAt
        };
    });
}

/**
 * Update a knowledge item
 */
async function updateKnowledge(knowledgeId, updates) {
    const firestore = getFirestore();
    const knowledgeRef = firestore.collection('knowledge').doc(knowledgeId);

    await knowledgeRef.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updated = await knowledgeRef.get();
    return { id: updated.id, ...updated.data() };
}

/**
 * Delete a knowledge item
 */
async function deleteKnowledge(knowledgeId) {
    const firestore = getFirestore();
    await firestore.collection('knowledge').doc(knowledgeId).delete();
    return true;
}

// ==================== Conversation Operations ====================

/**
 * Create a new conversation
 */
async function createConversation(chatbotId, userId = null, visitorId = null) {
    const firestore = getFirestore();
    const conversationRef = firestore.collection('conversations').doc();

    const conversation = {
        id: conversationRef.id,
        chatbotId,
        userId,
        visitorId: visitorId || `Visitor #${Math.floor(Math.random() * 10000)}`,
        messages: [],
        unreadCount: 0,
        lastMessageType: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await conversationRef.set(conversation);
    return { ...conversation, id: conversationRef.id };
}

/**
 * Add a message to a conversation
 */
async function addMessageToConversation(conversationId, message) {
    const firestore = getFirestore();
    const conversationRef = firestore.collection('conversations').doc(conversationId);

    const messageWithMetadata = {
        ...message,
        type: message.type || 'ai',
        timestamp: message.timestamp || new Date().toISOString(),
        read: false
    };

    const incrementUnread = messageWithMetadata.role === 'user';

    await conversationRef.update({
        messages: admin.firestore.FieldValue.arrayUnion(messageWithMetadata),
        lastMessageType: messageWithMetadata.type,
        unreadCount: incrementUnread ? admin.firestore.FieldValue.increment(1) : admin.firestore.FieldValue.increment(0),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updated = await conversationRef.get();
    return { id: updated.id, ...updated.data() };
}

/**
 * Get all conversations for a chatbot
 */
async function getConversationsByChatbotId(chatbotId, limit = 50) {
    const firestore = getFirestore();
    const snapshot = await firestore
        .collection('conversations')
        .where('chatbotId', '==', chatbotId)
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Subscribe to conversations for real-time updates (Firestore)
 */
function subscribeToConversations(chatbotId, callback, limitCount = 50) {
    const firestore = getFirestore();
    const q = firestore
        .collection('conversations')
        .where('chatbotId', '==', chatbotId)
        .limit(limitCount);

    return q.onSnapshot((snapshot) => {
        const conversations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        conversations.sort((a, b) => {
            const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt || 0).getTime();
            const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt || 0).getTime();
            return timeB - timeA;
        });
        callback(conversations);
    }, (error) => {
        console.error("Error subscribing to conversations:", error);
    });
}

/**
 * Get a specific conversation by ID
 */
async function getConversationById(conversationId) {
    const firestore = getFirestore();
    const doc = await firestore.collection('conversations').doc(conversationId).get();

    if (!doc.exists) {
        return null;
    }

    return { id: doc.id, ...doc.data() };
}

/**
 * Mark conversation as read
 */
async function markConversationAsRead(conversationId) {
    const firestore = getFirestore();
    const conversationRef = firestore.collection('conversations').doc(conversationId);

    await conversationRef.update({
        unreadCount: 0
    });

    return true;
}

/**
 * Send a live chat message
 */
async function sendLiveMessage(conversationId, messageData) {
    const message = {
        role: messageData.role || 'assistant',
        content: messageData.content,
        type: messageData.type || 'live',
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        timestamp: messageData.timestamp || new Date().toISOString(),
        read: false
    };

    return await addMessageToConversation(conversationId, message);
}

// ==================== Settings Operations ====================

/**
 * Get chatbot settings
 */
async function getChatbotSettings(chatbotId) {
    const firestore = getFirestore();
    const doc = await firestore.collection('settings').doc(chatbotId).get();

    if (!doc.exists) {
        return {
            chatbotId,
            apiKeys: {
                openai: '',
                gemini: ''
            },
            teamMembers: []
        };
    }

    return { id: doc.id, ...doc.data() };
}

/**
 * Update chatbot settings
 */
async function updateChatbotSettings(chatbotId, settings) {
    const firestore = getFirestore();
    const settingsRef = firestore.collection('settings').doc(chatbotId);

    await settingsRef.set({
        chatbotId,
        ...settings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const updated = await settingsRef.get();
    return { id: updated.id, ...updated.data() };
}

// ==================== Flow Operations ====================

/**
 * Save flow configuration
 */
async function saveFlow(chatbotId, flowData) {
    const firestore = getFirestore();
    const flowRef = firestore.collection('flows').doc(chatbotId);

    await flowRef.set({
        chatbotId,
        ...flowData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { id: flowRef.id, ...flowData };
}

/**
 * Get flow configuration
 */
async function getFlow(chatbotId) {
    const firestore = getFirestore();
    const doc = await firestore.collection('flows').doc(chatbotId).get();

    if (!doc.exists) {
        return null;
    }

    return { id: doc.id, ...doc.data() };
}

// ==================== Section Operations ====================

/**
 * Add a section to a chatbot
 */
async function addSection(chatbotId, sectionData) {
    const firestore = getFirestore();
    const sectionRef = firestore.collection('sections').doc();

    const section = {
        id: sectionRef.id,
        chatbotId,
        name: sectionData.name,
        description: sectionData.description || '',
        sources: sectionData.sources || [],
        tone: sectionData.tone || 'Neutral', // 'Strict' | 'Neutral' | 'Friendly' | 'Empathetic'
        scope: sectionData.scope || { allowed: [], blocked: [] },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await sectionRef.set(section);
    return { ...section, id: sectionRef.id };
}

/**
 * Get all sections for a chatbot
 */
async function getSectionsByChatbotId(chatbotId) {
    const firestore = getFirestore();
    const snapshot = await firestore
        .collection('sections')
        .where('chatbotId', '==', chatbotId)
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get section by ID
 */
async function getSectionById(sectionId) {
    const firestore = getFirestore();
    const doc = await firestore.collection('sections').doc(sectionId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

/**
 * Update a section
 */
async function updateSection(sectionId, updates) {
    const firestore = getFirestore();
    const sectionRef = firestore.collection('sections').doc(sectionId);
    await sectionRef.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const updated = await sectionRef.get();
    return { id: updated.id, ...updated.data() };
}

/**
 * Delete a section
 */
async function deleteSection(sectionId) {
    const firestore = getFirestore();
    await firestore.collection('sections').doc(sectionId).delete();
    return true;
}

/**
 * Get active conversation for a visitor
 */
async function getConversationByVisitorId(chatbotId, visitorId) {
    if (!chatbotId || !visitorId) return null;

    const firestore = getFirestore();
    const snapshot = await firestore
        .collection('conversations')
        .where('chatbotId', '==', chatbotId)
        .where('visitorId', '==', visitorId)
        .get();

    if (snapshot.empty) return null;

    const conversations = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            updatedAtMillis: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (new Date(data.updatedAt).getTime() || 0)
        };
    });

    conversations.sort((a, b) => b.updatedAtMillis - a.updatedAtMillis);
    return conversations[0];
}

/**
 * Update conversation fields
 */
async function updateConversation(conversationId, updates) {
    const firestore = getFirestore();
    const conversationRef = firestore.collection('conversations').doc(conversationId);

    await conversationRef.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updated = await conversationRef.get();
    return { id: updated.id, ...updated.data() };
}

// ==================== Workspace & User Operations ====================

/**
 * Get workspace settings for a user
 */
async function getWorkspace(userId) {
    const firestore = getFirestore();
    const doc = await firestore.collection('workspaces').doc(userId).get();

    if (!doc.exists) {
        return {
            userId,
            name: 'My Workspace',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
    }

    return { id: doc.id, ...doc.data() };
}

/**
 * Update workspace settings
 */
async function updateWorkspace(userId, updates) {
    const firestore = getFirestore();
    const workspaceRef = firestore.collection('workspaces').doc(userId);

    await workspaceRef.set({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const updated = await workspaceRef.get();
    return { id: updated.id, ...updated.data() };
}

/**
 * Get all users for cron subscription check
 */
async function getAllUsers() {
    const firestore = getFirestore();
    const snapshot = await firestore.collection('users').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export {
    // Workspace operations
    getWorkspace,
    updateWorkspace,
    getAllUsers,
    // Chatbot operations
    createChatbot,
    getChatbotsByUserId,
    getChatbotById,
    updateChatbot,
    deleteChatbot,
    // Knowledge operations
    addKnowledge,
    getKnowledgeById,
    getKnowledgeByChatbotId,
    updateKnowledge,
    deleteKnowledge,
    // Conversation operations
    createConversation,
    addMessageToConversation,
    getConversationsByChatbotId,
    subscribeToConversations,
    getConversationById,
    getConversationByVisitorId,
    markConversationAsRead,
    updateConversation,
    sendLiveMessage,
    // Settings operations
    getChatbotSettings,
    updateChatbotSettings,
    // Section operations
    addSection,
    getSectionsByChatbotId,
    getSectionById,
    updateSection,
    deleteSection,
    // Flow operations
    saveFlow,
    getFlow
};
