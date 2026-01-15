const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { getChatbotSettings, updateChatbotSettings } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');

/**
 * GET /api/settings/:chatbotId
 * Get chatbot settings
 */
export async function GET(request, { params }) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const { chatbotId } = params;

        // Verify ownership
        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) {
            return ownershipResult.error;
        }

        const settings = await getChatbotSettings(chatbotId);

        // Mask API keys for security
        const maskedSettings = {
            ...settings,
            apiKeys: {
                openai: settings.apiKeys?.openai ? '••••••••' + settings.apiKeys.openai.slice(-4) : '',
                gemini: settings.apiKeys?.gemini ? '••••••••' + settings.apiKeys.gemini.slice(-4) : ''
            }
        };

        return NextResponse.json({
            success: true,
            data: maskedSettings
        });
    } catch (error) {
        return handleApiError(error, 'fetching settings');
    }
}

/**
 * PUT /api/settings/:chatbotId
 * Update chatbot settings
 */
export async function PUT(request, { params }) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const { chatbotId } = params;
        const { apiKeys, teamMembers } = await request.json();

        // Verify ownership
        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) {
            return ownershipResult.error;
        }

        const updates = {};

        // Update API keys if provided
        if (apiKeys) {
            const currentSettings = await getChatbotSettings(chatbotId);
            updates.apiKeys = {
                openai: apiKeys.openai || currentSettings.apiKeys?.openai || '',
                gemini: apiKeys.gemini || currentSettings.apiKeys?.gemini || ''
            };
        }

        // Update team members if provided
        if (teamMembers) {
            updates.teamMembers = teamMembers;
        }

        const settings = await updateChatbotSettings(chatbotId, updates);

        // Mask API keys for response
        const maskedSettings = {
            ...settings,
            apiKeys: {
                openai: settings.apiKeys?.openai ? '••••••••' + settings.apiKeys.openai.slice(-4) : '',
                gemini: settings.apiKeys?.gemini ? '••••••••' + settings.apiKeys.gemini.slice(-4) : ''
            }
        };

        return NextResponse.json({
            success: true,
            data: maskedSettings,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        return handleApiError(error, 'updating settings');
    }
}
