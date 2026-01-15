const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { getKnowledgeByChatbotId } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');

/**
 * GET /api/knowledge/:chatbotId
 * List all knowledge items for a chatbot
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

        const knowledge = await getKnowledgeByChatbotId(chatbotId);

        return NextResponse.json({
            success: true,
            data: knowledge
        });
    } catch (error) {
        return handleApiError(error, 'fetching knowledge');
    }
}

/**
 * DELETE /api/knowledge/:chatbotId
 * Delete a knowledge item
 */
export async function DELETE(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const { chatbotId } = await params;
        const { sourceId } = await request.json();

        if (!sourceId) {
            return NextResponse.json({ success: false, error: 'BadRequest', message: 'Source ID is required' }, { status: 400 });
        }

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        const { deleteKnowledge } = require('@/lib/db');
        await deleteKnowledge(sourceId);

        return NextResponse.json({ success: true, message: 'Knowledge source deleted successfully' });
    } catch (error) {
        return handleApiError(error, 'deleting knowledge');
    }
}
