const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { addKnowledge } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');
const { summarizeContent, isGeminiConfigured } = require('@/lib/gemini');

/**
 * POST /api/knowledge/:chatbotId/file
 * Upload file to knowledge base with Gemini summarization
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
        const { filename, content, fileType } = await request.json();

        // Verify ownership
        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) {
            return ownershipResult.error;
        }

        if (!filename || !content) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'BadRequest',
                    message: 'Filename and content are required'
                },
                { status: 400 }
            );
        }

        // Check if Gemini is configured
        if (!isGeminiConfigured()) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'ConfigurationError',
                    message: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.'
                },
                { status: 500 }
            );
        }

        // Summarize the file content
        let summary;
        try {
            summary = await summarizeContent(content, 'file');
        } catch (error) {
            console.error('Summarization error:', error);
            // If summarization fails, use truncated content as fallback
            summary = content.substring(0, 500) + '...';
        }

        // Save to database
        const knowledge = await addKnowledge(chatbotId, {
            type: 'file',
            content: content,
            summary: summary,
            metadata: {
                filename,
                fileType: fileType || 'text/plain',
                size: content.length,
                uploadedAt: new Date().toISOString()
            }
        });

        return NextResponse.json(
            {
                success: true,
                data: knowledge,
                message: 'File uploaded and processed successfully'
            },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error, 'adding file knowledge');
    }
}

