const { NextResponse } = require('next/server');
const { getChatbotById, getSectionsByChatbotId, getFlow } = require('@/lib/db');
const { handleApiError } = require('@/lib/api-utils');

/**
 * GET /api/widget/:chatbotId/config
 * Get chatbot configuration, active sections, flow options, and suggested chips for widget (public endpoint)
 */
export async function GET(request, { params }) {
    try {
        const { chatbotId } = await params;

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

        if (chatbot.disabled) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'ChatbotDisabled',
                    message: 'This chatbot is currently inactive due to subscription status.'
                },
                { status: 403 }
            );
        }

        // Fetch sections for dynamic chips
        const sections = await getSectionsByChatbotId(chatbotId);

        // Build suggested question chips from sections & defaults
        const suggestedChips = [];
        sections.forEach(sec => {
            if (sec.name) suggestedChips.push(`Tell me about ${sec.name}`);
        });

        // Add default conversational chips if needed
        if (suggestedChips.length === 0) {
            suggestedChips.push('How can you help me?');
            suggestedChips.push('What are your services?');
            suggestedChips.push('Contact support');
        }

        // Fetch flow configuration if exists
        const flow = await getFlow(chatbotId);

        return NextResponse.json({
            success: true,
            data: {
                id: chatbot.id,
                name: chatbot.name,
                primaryColor: chatbot.primaryColor || 'blue',
                welcomeMessage: chatbot.welcomeMessage || 'Hi there! How can I assist you today?',
                theme: chatbot.theme || 'black',
                disabled: chatbot.disabled || false,
                sections: sections.map(sec => ({
                    id: sec.id,
                    name: sec.name,
                    description: sec.description || '',
                    tone: sec.tone || 'Neutral'
                })),
                suggestedChips,
                hasFlow: !!(flow && flow.startNodeId)
            }
        });
    } catch (error) {
        return handleApiError(error, 'fetching widget configuration');
    }
}
