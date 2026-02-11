import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { updateConversation, getConversationById, getChatbotById } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';

/**
 * POST /api/conversations/detail/:conversationId/emails
 * Update notification emails for a conversation
 */
export async function POST(request, { params }) {
    try {
        const { conversationId } = await params;
        const { emails } = await request.json();

        if (!Array.isArray(emails)) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Emails must be an array' },
                { status: 400 }
            );
        }

        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;

        // Get conversation
        const conversation = await getConversationById(conversationId);
        if (!conversation) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Conversation not found' },
                { status: 404 }
            );
        }

        // Verify ownership
        const chatbot = await getChatbotById(conversation.chatbotId);
        if (!chatbot || chatbot.userId !== user.uid) {
            return NextResponse.json(
                { success: false, error: 'Forbidden', message: 'Access denied' },
                { status: 403 }
            );
        }

        // Update conversation with new emails
        const updated = await updateConversation(conversationId, {
            notificationEmails: emails
        });

        return NextResponse.json({
            success: true,
            data: updated,
            message: 'Notification emails updated'
        });

    } catch (error) {
        return handleApiError(error, 'updating notification emails');
    }
}
