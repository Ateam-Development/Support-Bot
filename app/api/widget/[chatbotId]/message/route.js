const { NextResponse } = require('next/server');
const {
    getChatbotById,
    createConversation,
    addMessageToConversation,
    getConversationById,
    getSectionById
} = require('@/lib/db');
const { handleApiError } = require('@/lib/api-utils');
const { checkUserStatus } = require('@/lib/firebase-realtime');
const { sendEmail } = require('@/lib/email');
const { getRealtimeDb } = require('@/lib/firebase-admin');
const { retrieveContext } = require('@/lib/rag');
const { generateChatCompletion } = require('@/lib/gemini');

/**
 * Sync message to Realtime Database to ensure instant UI updates across dashboard & widget
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
        console.error('[RTDB-SYNC] Failed to sync:', error);
    }
}

/**
 * POST /api/widget/:chatbotId/message
 * Send message from public widget endpoint
 */
export async function POST(request, { params }) {
    try {
        const { chatbotId } = await params;
        const body = await request.json();
        const { message, conversationId, sectionId } = body;

        if (!message) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Message is required' },
                { status: 400 }
            );
        }

        // 1. Get Chatbot
        const chatbot = await getChatbotById(chatbotId);
        if (!chatbot) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Chatbot not found' },
                { status: 404 }
            );
        }

        if (chatbot.disabled) {
            return NextResponse.json(
                { success: false, error: 'ChatbotDisabled', message: 'This chatbot is currently inactive.' },
                { status: 403 }
            );
        }

        // 2. Get or create conversation
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
            conversation = await createConversation(chatbotId, null); // Anonymous user / visitor
        }

        // 3. Add User message
        const userMessage = {
            role: 'user',
            text: message,
            timestamp: new Date().toISOString()
        };

        await Promise.all([
            addMessageToConversation(conversation.id, userMessage),
            syncToRealtimeDB(conversation.id, userMessage, chatbotId)
        ]);

        // 4. Determine Section Guardrails & Tone
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

        // 5. Retrieve Context Chunks via RAG Engine
        let contextChunks = [];
        try {
            contextChunks = await retrieveContext(chatbotId, message, {
                allowedKnowledgeIds,
                topK: 5
            });
        } catch (ragErr) {
            console.error('[WIDGET-RAG] Context retrieval error:', ragErr);
        }

        // 6. Generate AI Response using Gemini with System Prompt & Section Rules
        let botText = '';
        try {
            botText = await generateChatCompletion({
                systemMessage: chatbot.systemMessage || 'You are a helpful assistant.',
                history: conversation.messages || [],
                userMessage: message,
                contextChunks,
                sectionTone,
                sectionScope
            });
        } catch (aiErr) {
            console.error('[WIDGET-AI] Chat completion error:', aiErr);
            botText = 'Thank you for reaching out! I am currently processing updates. How else may I help you?';
        }

        const botResponse = {
            role: 'assistant',
            text: botText,
            timestamp: new Date().toISOString()
        };

        // 7. Sync Bot Response concurrently to Firestore and Realtime DB
        await Promise.all([
            addMessageToConversation(conversation.id, botResponse),
            syncToRealtimeDB(conversation.id, botResponse, chatbotId)
        ]);

        // 8. Offline email notification logic
        try {
            if (chatbot.notificationEmails && chatbot.notificationEmails.length > 0) {
                const ownerStatus = await checkUserStatus(chatbot.userId);
                const isOffline = !ownerStatus.online;
                const lastSeenDiff = Date.now() - (new Date(ownerStatus.lastSeen).getTime() || 0);
                const isInactive = lastSeenDiff > 3 * 60 * 1000; // 3 minutes

                if (isOffline || isInactive) {
                    const subject = `New Widget Message - ${chatbot.name}`;
                    const html = `
                        <div style="font-family: sans-serif; padding: 20px; color: #333;">
                            <h2>New Visitor Message</h2>
                            <p>You received a message on <strong>${chatbot.name}</strong>:</p>
                            <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
                                ${message}
                            </blockquote>
                            <p style="color: #666; font-size: 14px;">Log in to your dashboard to view and reply.</p>
                        </div>
                    `;
                    await sendEmail(chatbot.notificationEmails, subject, html).catch(err => console.error('[EMAIL-ERR]', err));
                }
            }
        } catch (emailErr) {
            console.error('[WIDGET-EMAIL] Notification error:', emailErr);
        }

        return NextResponse.json({
            success: true,
            data: {
                conversationId: conversation.id,
                message: botResponse.text,
                timestamp: botResponse.timestamp
            }
        });
    } catch (error) {
        return handleApiError(error, 'processing widget message');
    }
}
