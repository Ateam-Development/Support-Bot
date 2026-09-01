const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { getKnowledgeById, updateKnowledge, deleteKnowledge } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');
const { deleteKnowledgeItemIndex, indexKnowledgeItem } = require('@/lib/rag');

/**
 * GET /api/knowledge/:chatbotId/:knowledgeId
 * Get a specific knowledge item
 */
export async function GET(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const { chatbotId, knowledgeId } = await params;

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        const knowledge = await getKnowledgeById(knowledgeId);
        if (!knowledge || knowledge.chatbotId !== chatbotId) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Knowledge item not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: knowledge
        });
    } catch (error) {
        return handleApiError(error, 'fetching knowledge item');
    }
}

/**
 * PUT /api/knowledge/:chatbotId/:knowledgeId
 * Update knowledge item content / title and re-index RAG vector embeddings
 */
export async function PUT(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const { chatbotId, knowledgeId } = await params;
        const { title, content } = await request.json();

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        const existingKnowledge = await getKnowledgeById(knowledgeId);
        if (!existingKnowledge || existingKnowledge.chatbotId !== chatbotId) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Knowledge item not found' },
                { status: 404 }
            );
        }

        const updates = {};
        if (content !== undefined) updates.content = content;
        if (title !== undefined) {
            updates.metadata = {
                ...(existingKnowledge.metadata || {}),
                title: title,
                lastEditedAt: new Date().toISOString()
            };
        }

        // 1. Update document in Firestore
        const updatedKnowledge = await updateKnowledge(knowledgeId, updates);

        // 2. If content changed, re-chunk and re-index vector embeddings in Firestore & Pinecone
        if (content !== undefined && content !== existingKnowledge.content) {
            try {
                console.log(`[KNOWLEDGE-REINDEX] Content changed for knowledgeId=${knowledgeId}. Re-indexing vectors...`);
                await deleteKnowledgeItemIndex(knowledgeId);
                await indexKnowledgeItem(updatedKnowledge, { chatbot: ownershipResult.chatbot });
            } catch (indexErr) {
                console.error('[KNOWLEDGE-REINDEX] Failed to re-index knowledge:', indexErr);
            }
        }

        return NextResponse.json({
            success: true,
            data: updatedKnowledge,
            message: 'Knowledge item updated and re-indexed successfully'
        });
    } catch (error) {
        return handleApiError(error, 'updating knowledge item');
    }
}

/**
 * DELETE /api/knowledge/:chatbotId/:knowledgeId
 * Delete knowledge item and clean up vector index chunks from Firestore and Pinecone
 */
export async function DELETE(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const { chatbotId, knowledgeId } = await params;

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        // 1. Delete knowledge item document
        await deleteKnowledge(knowledgeId);

        // 2. Clean up vector index chunks from Firestore and Pinecone
        try {
            await deleteKnowledgeItemIndex(knowledgeId);
        } catch (cleanErr) {
            console.error('[KNOWLEDGE-DELETE] Failed to clean vector index:', cleanErr);
        }

        return NextResponse.json({
            success: true,
            message: 'Knowledge item and associated vector indexes deleted successfully'
        });
    } catch (error) {
        return handleApiError(error, 'deleting knowledge');
    }
}
