import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getChatbotsByUserId, createChatbot } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';

/**
 * GET /api/chatbots
 * List all chatbots for authenticated user
 */
export async function GET(request) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const chatbots = await getChatbotsByUserId(user.uid);

        return NextResponse.json({
            success: true,
            data: chatbots
        });
    } catch (error) {
        return handleApiError(error, 'fetching chatbots');
    }
}

/**
 * POST /api/chatbots
 * Create a new chatbot
 */
export async function POST(request) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const { name, primaryColor, welcomeMessage, model } = await request.json();

        const chatbot = await createChatbot(user.uid, {
            name,
            primaryColor,
            welcomeMessage,
            model
        });

        return NextResponse.json(
            {
                success: true,
                data: chatbot
            },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error, 'creating chatbot');
    }
}
