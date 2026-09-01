const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { addKnowledge } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');
const { cleanAndFormatContent } = require('@/lib/llm');
const { indexKnowledgeItem } = require('@/lib/rag');

/**
 * POST /api/knowledge/:chatbotId/text
 * Add manual text to knowledge base with LLM formatting and instant RAG vector indexing
 */
export async function POST(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const { chatbotId } = await params;
        const { text, title } = await request.json();

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        if (!text) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Text is required' },
                { status: 400 }
            );
        }

        // 1. Clean & structure text using configured LLM if significant length
        let cleanedContent = text;
        if (text.length > 300) {
            const formatted = await cleanAndFormatContent(text, ownershipResult.chatbot);
            cleanedContent = formatted || text || '';
        }

        cleanedContent = cleanedContent || text || '';

        // 2. Save knowledge to Firestore
        const knowledge = await addKnowledge(chatbotId, {
            type: 'text',
            content: cleanedContent,
            metadata: {
                title: title || 'Manual Entry',
                length: (cleanedContent || '').length,
                createdAt: new Date().toISOString()
            }
        });

        // 3. Instant RAG Indexing
        try {
            await indexKnowledgeItem(knowledge, { chatbot: ownershipResult.chatbot });
        } catch (indexErr) {
            console.error('[KNOWLEDGE-INDEX] Error indexing text knowledge:', indexErr);
        }

        return NextResponse.json(
            {
                success: true,
                data: knowledge,
                message: 'Text knowledge added and indexed successfully'
            },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error, 'adding text knowledge');
    }
}
