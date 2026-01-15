import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getConversationById, getChatbotById, markConversationAsRead } from '@/lib/db';
import { updateConversationMetadata } from '@/lib/firebase-realtime';
import { handleApiError } from '@/lib/api-utils';

/**
 * POST /api/conversations/detail/:conversationId/read
 * Mark a conversation as read
 */
export async function POST(request, { params }) {
    try {
        const { conversationId } = await params;

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

        // Mark as read in Firestore
        await markConversationAsRead(conversationId);

        // Update metadata in Realtime DB
        try {
            await updateConversationMetadata(conversationId, {
                unreadCount: 0
            });
        } catch (realtimeError) {
            console.error('Failed to update Realtime DB metadata:', realtimeError);
            // Continue even if Realtime DB fails
        }

        return NextResponse.json({
            success: true,
            message: 'Conversation marked as read'
        });

    } catch (error) {
        return handleApiError(error, 'marking conversation as read');
    }
}
