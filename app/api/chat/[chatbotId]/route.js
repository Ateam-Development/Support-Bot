const { NextResponse } = require('next/server');
const { optionalAuth } = require('@/lib/auth-middleware');
const {
    getChatbotById,
    createConversation,
    addMessageToConversation,
    getConversationById,
    getSectionById
} = require('@/lib/db');
const { handleApiError } = require('@/lib/api-utils');
const { retrieveContext } = require('@/lib/rag');
const { generateMultiProviderCompletion } = require('@/lib/llm');
const { getRealtimeDb } = require('@/lib/firebase-admin');

/**
 * Sync message to Firebase Realtime Database concurrently
 */
async function syncToRealtimeDB(conversationId, message, chatbotId) {
    try {
        const rtdb = getRealtimeDb();
        const messagesRef = rtdb.ref(`conversations/${conversationId}/messages`);
        await messagesRef.push({
            ...message,
            timestamp: message.timestamp || new Date().toISOString()
        });

        const metadataRef = rtdb.ref(`conversations/${conversationId}/metadata`);
        await metadataRef.update({
            lastMessage: message.text || message.content || '',
            lastMessageType: message.role === 'user' ? 'text' : 'ai',
            lastUpdated: new Date().toISOString()
        });

        if (message.role === 'user') {
            const statsRef = rtdb.ref(`chatbots/${chatbotId}/stats`);
            await statsRef.update({
                unreadCount: require('firebase-admin').database.ServerValue.increment(1)
            });
        }
    } catch (error) {
        console.error('[RTDB-SYNC] Failed sync:', error);
    }
}

/**
 * POST /api/chat/:chatbotId
 * Main Chat & RAG Completion Engine Endpoint
 */
export async function POST(request, { params }) {
    try {
        const { chatbotId } = await params;
        const body = await request.json();
        const { message, conversationId, sectionId } = body;

        const authResult = await optionalAuth(request);
        const userId = authResult.user?.uid || null;

        if (!message) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Message is required' },
                { status: 400 }
            );
        }

        // Get Chatbot configuration
        const chatbot = await getChatbotById(chatbotId);
        if (!chatbot) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Chatbot not found' },
                { status: 404 }
            );
        }

        if (chatbot.disabled) {
            return NextResponse.json(
                { success: false, error: 'ChatbotDisabled', message: 'This chatbot is currently disabled.' },
                { status: 403 }
            );
        }

        // Get or Create Conversation
        let conversation;
        if (conversationId) {
            conversation = await getConversationById(conversationId);
            if (!conversation || conversation.chatbotId !== chatbotId) {
                return NextResponse.json(
                    { success: false, error: 'NotFound', message: 'Conversation not found' },
                    { status: 404 }
                );
            }
        } else {
            conversation = await createConversation(chatbotId, userId);
        }

        // Add user message
        const userMessage = {
            role: 'user',
            text: message,
            timestamp: new Date().toISOString()
        };

        await Promise.all([
            addMessageToConversation(conversation.id, userMessage),
            syncToRealtimeDB(conversation.id, userMessage, chatbotId)
        ]);

        // Section Tone & Scope Filtering
        let allowedKnowledgeIds = null;
        let sectionTone = 'Neutral';
        let sectionScope = null;

        if (sectionId) {
            const section = await getSectionById(sectionId);
            if (section) {
                sectionTone = section.tone || 'Neutral';
                sectionScope = section.scope || null;
                allowedKnowledgeIds = (section.sources && section.sources.length > 0) ? section.sources : null;
            }
        }

        // Retrieve Context via RAG Engine
        let contextChunks = [];
        try {
            contextChunks = await retrieveContext(chatbotId, message, {
                allowedKnowledgeIds,
                topK: 5
            });
        } catch (ragErr) {
            console.error('[RAG-CHAT] Error retrieving context:', ragErr);
        }

        // Generate AI Response using OpenAI / Gemini / Mistral with System Message, RAG Context & Section Rules
        let botText = '';
        try {
            botText = await generateMultiProviderCompletion({
                chatbot,
                provider: chatbot.provider || chatbot.model,
                model: chatbot.modelName,
                systemMessage: chatbot.systemMessage || 'You are a helpful assistant.',
                history: conversation.messages || [],
                userMessage: message,
                contextChunks,
                sectionTone,
                sectionScope
            });
        } catch (aiErr) {
            console.error('[AI-CHAT] Error generating completion:', aiErr);
            botText = `I am currently having trouble processing your request: ${aiErr.message || 'Please check your API key settings.'}`;
        }

        const botResponse = {
            role: 'assistant',
            text: botText,
            timestamp: new Date().toISOString()
        };

        // Dual Sync Bot Response
        await Promise.all([
            addMessageToConversation(conversation.id, botResponse),
            syncToRealtimeDB(conversation.id, botResponse, chatbotId)
        ]);

        return NextResponse.json({
            success: true,
            data: {
                conversationId: conversation.id,
                message: botResponse.text,
                timestamp: botResponse.timestamp,
                chatbotId: chatbotId
            }
        });
    } catch (error) {
        return handleApiError(error, 'processing chat message');
    }
}
