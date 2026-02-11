import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getChatbotById, updateChatbot, deleteChatbot } from '@/lib/db';
import { verifyChatbotOwnership, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/chatbots/:id
 * Get specific chatbot details
 */
export async function GET(request, { params }) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const { id } = await params;

        // Verify ownership
        const ownershipResult = await verifyChatbotOwnership(id, user.uid);
        if (ownershipResult.error) {
            return ownershipResult.error;
        }

        return NextResponse.json({
            success: true,
            data: ownershipResult.chatbot
        });
    } catch (error) {
        return handleApiError(error, 'fetching chatbot');
    }
}

/**
 * PUT /api/chatbots/:id
 * Update chatbot configuration
 */
export async function PUT(request, { params }) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const { id } = await params;
        const body = await request.json();
        const { name, primaryColor, welcomeMessage, theme, openaiApiKey, geminiApiKey, mistralApiKey, systemMessage, config, allowedOrigins } = body;

        // Verify ownership
        const ownershipResult = await verifyChatbotOwnership(id, user.uid);
        if (ownershipResult.error) {
            return ownershipResult.error;
        }

        const { chatbot } = ownershipResult;

        // Update chatbot
        const updates = {};
        if (name) updates.name = name;
        if (primaryColor) updates.primaryColor = primaryColor;
        if (welcomeMessage !== undefined) updates.welcomeMessage = welcomeMessage;
        if (theme) updates.theme = theme;
        if (openaiApiKey !== undefined) updates.openaiApiKey = openaiApiKey;
        if (geminiApiKey !== undefined) updates.geminiApiKey = geminiApiKey;
        if (mistralApiKey !== undefined) updates.mistralApiKey = mistralApiKey;
        if (systemMessage !== undefined) updates.systemMessage = systemMessage;
        if (config) updates.config = { ...chatbot.config, ...config };

        // Allowed Origins for CORS/Security
        if (allowedOrigins && Array.isArray(allowedOrigins)) {
            // Validate structure (optional but good practice)
            // Accepts strings (old) or objects {name, url} (new)
            updates.allowedOrigins = allowedOrigins;
        }


        const updatedChatbot = await updateChatbot(id, updates);

        return NextResponse.json({
            success: true,
            data: updatedChatbot
        });
    } catch (error) {
        return handleApiError(error, 'updating chatbot');
    }
}

/**
 * DELETE /api/chatbots/:id
 * Delete chatbot
 */
export async function DELETE(request, { params }) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const { id } = await params;

        // Verify ownership
        const ownershipResult = await verifyChatbotOwnership(id, user.uid);
        if (ownershipResult.error) {
            return ownershipResult.error;
        }

        await deleteChatbot(id);

        return NextResponse.json({
            success: true,
            message: 'Chatbot deleted successfully'
        });
    } catch (error) {
        return handleApiError(error, 'deleting chatbot');
    }
}
