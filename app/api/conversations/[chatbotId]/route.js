const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { getConversationsByChatbotId } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');

/**
 * GET /api/conversations/:chatbotId
 * Get all conversations for a chatbot
 */
export async function GET(request, { params }) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const { chatbotId } = await params;

        // Verify ownership
        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) {
            return ownershipResult.error;
        }

        // Get limit from query params
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 50;

        const conversations = await getConversationsByChatbotId(chatbotId, limit);

        console.log(`[API] Found ${conversations.length} conversations for chatbot ${chatbotId}`);
        if (conversations.length > 0) {
            console.log('[API] First conversation:', JSON.stringify(conversations[0], null, 2));
        }

        // Format conversations for display
        const formattedConversations = conversations.map(conv => {
            const lastMessage = conv.messages && conv.messages.length > 0
                ? conv.messages[conv.messages.length - 1]
                : null;

            return {
                id: conv.id,
                chatbotId: conv.chatbotId,
                visitorId: conv.visitorId,
                userId: conv.userId || null,
                lastMessage: lastMessage ? lastMessage.content : 'No messages',
                lastMessageType: conv.lastMessageType || (lastMessage ? lastMessage.type : null),
                messageCount: conv.messages ? conv.messages.length : 0,
                unreadCount: conv.unreadCount || 0,
                createdAt: conv.createdAt,
                updatedAt: conv.updatedAt
            };
        });

        return NextResponse.json({
            success: true,
            data: formattedConversations
        });
    } catch (error) {
        return handleApiError(error, 'fetching conversations');
    }
}
