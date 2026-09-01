const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { addKnowledge } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');
const { cleanAndFormatContent } = require('@/lib/llm');
const { indexKnowledgeItem } = require('@/lib/rag');

/**
 * POST /api/knowledge/:chatbotId/file
 * Upload file to knowledge base with LLM formatting and instant RAG vector indexing
 */
export async function POST(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const { chatbotId } = await params;
        const { filename, content, fileType } = await request.json();

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        if (!filename || !content) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Filename and content are required' },
                { status: 400 }
            );
        }

        // 1. Clean & structure content with configured LLM
        const formatted = await cleanAndFormatContent(content, ownershipResult.chatbot);
        const cleanedContent = formatted || content || '';

        // 2. Save knowledge to Firestore
        const knowledge = await addKnowledge(chatbotId, {
            type: 'file',
            content: cleanedContent,
            metadata: {
                filename,
                fileType: fileType || 'text/plain',
                size: (cleanedContent || '').length,
                uploadedAt: new Date().toISOString()
            }
        });

        // 3. Instant RAG Indexing
        try {
            await indexKnowledgeItem(knowledge, { chatbot: ownershipResult.chatbot });
        } catch (indexErr) {
            console.error('[KNOWLEDGE-INDEX] Error indexing file knowledge:', indexErr);
        }

        return NextResponse.json(
            {
                success: true,
                data: knowledge,
                message: 'File processed and indexed into Knowledge Base successfully'
            },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error, 'adding file knowledge');
    }
}
