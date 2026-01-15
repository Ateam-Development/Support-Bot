import { NextResponse } from 'next/server';
import { getChatbotById, getSectionsByChatbotId } from '@/lib/db';

/**
 * GET /api/widget/:chatbotId
 * Public endpoint to fetch chatbot configuration for widget
 * No authentication required
 */
export async function GET(request, { params }) {
    try {
        const { chatbotId } = await params;

        // Get chatbot configuration
        const chatbot = await getChatbotById(chatbotId);

        if (!chatbot) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Chatbot not found' },
                { status: 404 }
            );
        }

        // Get sections
        const sections = await getSectionsByChatbotId(chatbotId);

        // Return public configuration (no sensitive data like API keys)
        const publicConfig = {
            id: chatbot.id,
            name: chatbot.name || 'Support',
            primaryColor: chatbot.primaryColor || 'blue',
            theme: chatbot.theme || 'black',
            welcomeMessage: chatbot.welcomeMessage || 'Hello! What you Want to Ask!',
            sections: sections.map(s => ({
                id: s.id,
                name: s.name,
                description: s.description
            }))
        };

        return NextResponse.json({
            success: true,
            data: publicConfig
        });

    } catch (error) {
        console.error('Widget config error:', error);
        return NextResponse.json(
            { success: false, error: 'InternalError', message: 'Failed to fetch chatbot configuration' },
            { status: 500 }
        );
    }
}
