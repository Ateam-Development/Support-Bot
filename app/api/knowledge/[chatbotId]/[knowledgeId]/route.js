const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { deleteKnowledge } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');

/**
 * DELETE /api/knowledge/:chatbotId/:knowledgeId
 * Delete knowledge item
 */
export async function DELETE(request, { params }) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const { chatbotId, knowledgeId } = params;

        // Verify ownership
        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) {
            return ownershipResult.error;
        }

        await deleteKnowledge(knowledgeId);

        return NextResponse.json({
            success: true,
            message: 'Knowledge item deleted successfully'
        });
    } catch (error) {
        return handleApiError(error, 'deleting knowledge');
    }
}
