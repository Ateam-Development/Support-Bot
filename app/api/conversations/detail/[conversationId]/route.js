const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { getConversationById, getChatbotById } = require('@/lib/db');
const { handleApiError } = require('@/lib/api-utils');

/**
 * GET /api/conversations/detail/:conversationId
 * Get specific conversation with all messages
 */
export async function GET(request, { params }) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const { conversationId } = await params;

        const conversation = await getConversationById(conversationId);

        if (!conversation) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NotFound',
                    message: 'Conversation not found'
                },
                { status: 404 }
            );
        }

        // Verify ownership of the chatbot
        const chatbot = await getChatbotById(conversation.chatbotId);
        if (!chatbot || chatbot.userId !== user.uid) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Forbidden',
                    message: 'You do not have access to this conversation'
                },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            data: conversation
        });
    } catch (error) {
        return handleApiError(error, 'fetching conversation');
    }
}
