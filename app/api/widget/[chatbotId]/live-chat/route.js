import { NextResponse } from 'next/server';
import { getChatbotById, createConversation, addMessageToConversation, getConversationById, getConversationByVisitorId } from '@/lib/db';
import { addRealtimeMessage } from '@/lib/firebase-realtime';

/**
 * POST /api/widget/:chatbotId/live-chat
 * Public endpoint for sending live chat messages from widget
 * No authentication required
 */
export async function POST(request, { params }) {
    try {
        const { chatbotId } = await params;
        const { message, conversationId, visitorId } = await request.json();

        if (!message) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Message is required' },
                { status: 400 }
            );
        }

        // Get chatbot configuration
        const chatbot = await getChatbotById(chatbotId);

        if (!chatbot) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Chatbot not found' },
                { status: 404 }
            );
        }

        // Get or create conversation
        let conversation;
        if (conversationId) {
            conversation = await getConversationById(conversationId);
            if (!conversation || conversation.chatbotId !== chatbotId) {
                // Invalid conversation ID, try finding by visitorId if available
                if (visitorId) {
                    conversation = await getConversationByVisitorId(chatbotId, visitorId);
                }

                // If still no conversation, create new one
                if (!conversation) {
                    conversation = await createConversation(chatbotId, null, visitorId);
                }
            }
        } else {
            // No ID provided, try finding existing active conversation by visitorId
            if (visitorId) {
                conversation = await getConversationByVisitorId(chatbotId, visitorId);
            }

            // Create new if none found
            if (!conversation) {
                conversation = await createConversation(chatbotId, null, visitorId);
            }
        }

        // Add user message to conversation
        const userMessage = {
            role: 'user',
            content: message,
            type: 'live', // This is a live chat message
            timestamp: new Date().toISOString()
        };
        await addMessageToConversation(conversation.id, userMessage);

        // Sync to Realtime DB for instant delivery
        try {
            await addRealtimeMessage(conversation.id, userMessage);
        } catch (e) {
            console.error('Realtime DB sync failed:', e);
        }

        return NextResponse.json({
            success: true,
            data: {
                conversationId: conversation.id,
                visitorId: conversation.visitorId
            }
        });

    } catch (error) {
        console.error('Live chat error:', error);
        return NextResponse.json(
            { success: false, error: 'InternalError', message: 'Failed to process message' },
            { status: 500 }
        );
    }
}
