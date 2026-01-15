const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { addKnowledge } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');
const { summarizeContent, isGeminiConfigured } = require('@/lib/gemini');

/**
 * POST /api/knowledge/:chatbotId/text
 * Add manual text to knowledge base with optional summarization
 */
export async function POST(request, { params }) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const { chatbotId } = await params;
        const { text, title } = await request.json();

        // Verify ownership
        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) {
            return ownershipResult.error;
        }

        if (!text) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'BadRequest',
                    message: 'Text is required'
                },
                { status: 400 }
            );
        }

        // Optionally summarize if text is long (>2000 characters) and Gemini is configured
        let summary = null;
        if (text.length > 2000 && isGeminiConfigured()) {
            try {
                summary = await summarizeContent(text, 'text');
            } catch (error) {
                console.error('Summarization error:', error);
                // Continue without summary if it fails
                summary = text.substring(0, 300) + '...';
            }
        } else {
            // For short texts, use the text itself as summary
            summary = text.length > 300 ? text.substring(0, 300) + '...' : text;
        }

        const knowledge = await addKnowledge(chatbotId, {
            type: 'text',
            content: text,
            summary: summary,
            metadata: {
                title: title || 'Manual Entry',
                length: text.length,
                createdAt: new Date().toISOString()
            }
        });

        return NextResponse.json(
            {
                success: true,
                data: knowledge,
                message: 'Text added successfully'
            },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error, 'adding text knowledge');
    }
}

