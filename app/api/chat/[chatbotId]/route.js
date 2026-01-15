const { NextResponse } = require('next/server');
const { optionalAuth } = require('@/lib/auth-middleware');
const {
    getChatbotById,
    getKnowledgeByChatbotId,
    createConversation,
    addMessageToConversation,
    getConversationById
} = require('@/lib/db');
const { handleApiError } = require('@/lib/api-utils');

/**
 * POST /api/chat/:chatbotId
 * Send a message to the chatbot
 * Supports both authenticated and anonymous users
 */
export async function POST(request, { params }) {
    try {
        const { chatbotId } = await params;
        const { message, conversationId } = await request.json();

        // Optional authentication
        const authResult = await optionalAuth(request);
        const userId = authResult.user?.uid || null;

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

        // Get chatbot configuration
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
            conversation = await createConversation(chatbotId, userId);
        }

        // Add user message to conversation
        const userMessage = {
            role: 'user',
            text: message,
            timestamp: new Date().toISOString()
        };

        await addMessageToConversation(conversation.id, userMessage);

        // Get knowledge base for context
        const knowledge = await getKnowledgeByChatbotId(chatbotId);
        const knowledgeContext = knowledge.map(k => k.content).join('\n\n');

        // TODO: Implement actual AI model integration (OpenAI/Gemini)
        // For now, return a placeholder response
        const botResponse = {
            role: 'assistant',
            text: `${chatbot.config.welcomeMessage}\n\nYou said: "${message}"\n\nThis is a placeholder response. AI model integration will be implemented soon.\n\nKnowledge base items: ${knowledge.length}`,
            timestamp: new Date().toISOString()
        };

        // Add bot response to conversation
        await addMessageToConversation(conversation.id, botResponse);

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
        return handleApiError(error, 'processing your message');
    }
}
