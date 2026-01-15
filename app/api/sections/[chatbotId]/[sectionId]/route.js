const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { updateSection } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');

/**
 * PUT /api/sections/:chatbotId/:sectionId
 * Update a specific section
 */
export async function PUT(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const { chatbotId, sectionId } = params;
        const sectionData = await request.json();

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        const updatedSection = await updateSection(sectionId, sectionData);

        return NextResponse.json({
            success: true,
            data: updatedSection
        });
    } catch (error) {
        return handleApiError(error, 'updating section');
    }
}

/**
 * DELETE /api/sections/:chatbotId/:sectionId
 * Delete a specific section
 */
export async function DELETE(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const { chatbotId, sectionId } = params;

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        await deleteSection(sectionId);

        return NextResponse.json({
            success: true,
            message: 'Section deleted successfully'
        });
    } catch (error) {
        return handleApiError(error, 'deleting section');
    }
}
