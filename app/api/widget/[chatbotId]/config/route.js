const { NextResponse } = require('next/server');
const { getChatbotById } = require('@/lib/db');
const { handleApiError } = require('@/lib/api-utils');

/**
 * GET /api/widget/:chatbotId/config
 * Get chatbot configuration for widget (public endpoint)
 */
export async function GET(request, { params }) {
    try {
        const { chatbotId } = params;

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

        // Return only public configuration
        return NextResponse.json({
            success: true,
            data: {
                id: chatbot.id,
                name: chatbot.name,
                primaryColor: chatbot.primaryColor || 'blue',
                welcomeMessage: chatbot.welcomeMessage || 'Hi there! How can I assist you today?'
            }
        });
    } catch (error) {
        return handleApiError(error, 'fetching widget configuration');
    }
}

