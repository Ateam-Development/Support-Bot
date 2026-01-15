import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getConversationById, getChatbotById, sendLiveMessage } from '@/lib/db';
import { addRealtimeMessage } from '@/lib/firebase-realtime';
import { handleApiError } from '@/lib/api-utils';

/**
 * POST /api/conversations/detail/:conversationId/messages
 * Send a live chat message from dashboard
 */
export async function POST(request, { params }) {
    try {
        const { conversationId } = await params;
        const { content } = await request.json();

        if (!content) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Message content is required' },
                { status: 400 }
            );
        }

        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;

        // Get conversation and verify ownership
        const conversation = await getConversationById(conversationId);
        if (!conversation) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Conversation not found' },
                { status: 404 }
            );
        }

        // Verify user owns the chatbot
        const chatbot = await getChatbotById(conversation.chatbotId);
        if (!chatbot || chatbot.userId !== user.uid) {
            return NextResponse.json(
                { success: false, error: 'Forbidden', message: 'Access denied' },
                { status: 403 }
            );
        }

        // Create message object
        const message = {
            role: 'assistant',
            content,
            type: 'live',
            senderId: user.uid,
            senderName: user.email || 'Support Agent',
            timestamp: new Date().toISOString()
        };

        // Save to Firestore
        const updatedConversation = await sendLiveMessage(conversationId, message);

        // Sync to Realtime Database for instant updates
        try {
            await addRealtimeMessage(conversationId, message);
        } catch (realtimeError) {
            console.error('Failed to sync to Realtime DB:', realtimeError);
            // Continue even if Realtime DB fails - Firestore is source of truth
        }

        return NextResponse.json({
            success: true,
            data: updatedConversation,
            message: 'Message sent successfully'
        });

    } catch (error) {
        return handleApiError(error, 'sending message');
    }
}
