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
        welcomeMessage: chatbotData.welcomeMessage || 'Hello! What you Want to Ask!',
        theme: chatbotData.theme || 'black',
        openaiApiKey: chatbotData.openaiApiKey || '',
        geminiApiKey: chatbotData.geminiApiKey || '',
        systemMessage: chatbotData.systemMessage || 'You are a helpful assistant.',
        model: chatbotData.model || 'gemini',
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

    // Sort on client side to avoid index requirement
    const chatbots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return chatbots.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime; // desc order
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

    // Delete chatbot
    await firestore.collection('chatbots').doc(chatbotId).delete();

    // Delete associated knowledge
    const knowledgeSnapshot = await firestore
        .collection('knowledge')
        .where('chatbotId', '==', chatbotId)
        .get();

    const knowledgeBatch = firestore.batch();
    knowledgeSnapshot.docs.forEach(doc => {
        knowledgeBatch.delete(doc.ref);
    });
    await knowledgeBatch.commit();

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

    // Delete settings
    await firestore.collection('settings').doc(chatbotId).delete();

    return true;
}

// ==================== Knowledge Operations ====================

/**
 * Add knowledge to a chatbot
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
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await knowledgeRef.set(knowledge);
    return { ...knowledge, id: knowledgeRef.id };
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
        userId, // Can be null for anonymous users
        visitorId: visitorId || `Visitor #${Math.floor(Math.random() * 10000)}`,
        messages: [],
        unreadCount: 0,
        lastMessageType: null, // 'ai' or 'live'
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
        type: message.type || 'ai', // 'ai' or 'live'
        timestamp: message.timestamp || new Date().toISOString(),
        read: false
    };

    await conversationRef.update({
        messages: admin.firestore.FieldValue.arrayUnion(messageWithMetadata),
        lastMessageType: messageWithMetadata.type,
        unreadCount: admin.firestore.FieldValue.increment(1),
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
        // .orderBy('updatedAt', 'desc') // Commented out to prevent index error during dev
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        unreadCount: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
        // Return default settings
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
        description: sectionData.description,
        sources: sectionData.sources || [],
        tone: sectionData.tone || 'Neutral',
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
 * Get active conversation for a visitor
 */
async function getConversationByVisitorId(chatbotId, visitorId) {
    if (!chatbotId || !visitorId) return null;

    const firestore = getFirestore();

    // Query matching conversations
    // Sorting in-memory to avoid requiring a composite index immediately
    const snapshot = await firestore
        .collection('conversations')
        .where('chatbotId', '==', chatbotId)
        .where('visitorId', '==', visitorId)
        .get();

    if (snapshot.empty) return null;

    // Convert to array and sort by updatedAt desc
    const conversations = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // Handle timestamp normalization
            updatedAtMillis: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (new Date(data.updatedAt).getTime() || 0)
        };
    });

    conversations.sort((a, b) => b.updatedAtMillis - a.updatedAtMillis);

    // Return the latest active conversation
    return conversations[0];
}


// ==================== Workspace Operations ====================

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

export {
    // Workspace operations
    getWorkspace,
    updateWorkspace,
    // Chatbot operations
    createChatbot,
    getChatbotsByUserId,
    getChatbotById,
    updateChatbot,
    deleteChatbot,
    // Knowledge operations
    addKnowledge,
    getKnowledgeByChatbotId,
    deleteKnowledge,
    // Conversation operations
    createConversation,
    addMessageToConversation,
    getConversationsByChatbotId,
    getConversationById,
    getConversationByVisitorId,
    markConversationAsRead,
    sendLiveMessage,
    // Settings operations
    getChatbotSettings,
    updateChatbotSettings,
    // Section operations
    addSection,
    getSectionsByChatbotId
};

