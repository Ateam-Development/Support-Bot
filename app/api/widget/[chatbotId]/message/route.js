const { NextResponse } = require('next/server');
const {
    getChatbotById,
    createConversation,
    addMessageToConversation,
    getConversationById,
    getKnowledgeByChatbotId
} = require('@/lib/db');
const { handleApiError } = require('@/lib/api-utils');

/**
 * POST /api/widget/:chatbotId/message
 * Send message from widget (public endpoint)
 */
export async function POST(request, { params }) {
    try {
        const { chatbotId } = params;
        const { message, conversationId } = await request.json();

        if (!message) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'BadRequest',
                    message: 'Message is required'
                },
                { status: 400 }
            );
        }

        // Get chatbot
        const chatbot = await getChatbotById(chatbotId);
        if (!chatbot) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NotFound',
                    message: 'Chatbot not found'
                },
                { status: 404 }
            );
        }

        // Get or create conversation
        let conversation;
        if (conversationId) {
            conversation = await getConversationById(conversationId);
            if (!conversation || conversation.chatbotId !== chatbotId) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'NotFound',
                        message: 'Conversation not found'
                    },
                    { status: 404 }
                );
            }
        } else {
            conversation = await createConversation(chatbotId, null); // Anonymous user
        }

        // Add user message
        const userMessage = {
            role: 'user',
            text: message,
            timestamp: new Date().toISOString()
        };

        await addMessageToConversation(conversation.id, userMessage);

        // Get knowledge base
        const knowledge = await getKnowledgeByChatbotId(chatbotId);

        // TODO: Implement AI model integration
        const welcomeMsg = chatbot.welcomeMessage || 'Hi there! How can I assist you today?';
        const botResponse = {
            role: 'assistant',
            text: `Thank you for your message! You said: "${message}"\n\nThis is a placeholder response. AI integration coming soon!\n\nKnowledge base items: ${knowledge.length}`,
            timestamp: new Date().toISOString()
        };

        await addMessageToConversation(conversation.id, botResponse);

        return NextResponse.json({
            success: true,
            data: {
                conversationId: conversation.id,
                message: botResponse.text,
                timestamp: botResponse.timestamp
            }
        });
    } catch (error) {
        return handleApiError(error, 'processing message');
    }
}

