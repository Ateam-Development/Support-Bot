const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { addKnowledge } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');
const { scrapeWebsite, isFirecrawlConfigured } = require('@/lib/firecrawl');
const { cleanAndFormatContent } = require('@/lib/llm');
const { indexKnowledgeItem } = require('@/lib/rag');

/**
 * POST /api/knowledge/:chatbotId/website
 * Add website knowledge (either directly with reviewed/edited content or by scraping)
 */
export async function POST(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const { chatbotId } = await params;
        const body = await request.json();
        const { url, title: customTitle, content: customContent } = body;

        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        if (!url) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'URL is required' },
                { status: 400 }
            );
        }

        try {
            new URL(url);
        } catch (e) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Invalid URL format' },
                { status: 400 }
            );
        }

        let finalTitle = customTitle;
        let finalContent = customContent;

        // If content was not already provided from the review/edit screen, scrape and structure now
        if (!finalContent) {
            if (!isFirecrawlConfigured()) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'ConfigurationError',
                        message: 'Firecrawl API key is not configured. Please add FIRECRAWL_API_KEY to your environment variables.'
                    },
                    { status: 500 }
                );
            }

            let scrapedData;
            try {
                scrapedData = await scrapeWebsite(url);
            } catch (error) {
                return NextResponse.json(
                    { success: false, error: 'ScrapingError', message: `Failed to scrape website: ${error.message}` },
                    { status: 500 }
                );
            }

            const rawContent = (scrapedData && (scrapedData.markdown || scrapedData.content)) || '';
            const formatted = await cleanAndFormatContent(rawContent, ownershipResult.chatbot);
            finalContent = formatted || rawContent || '';
            finalTitle = finalTitle || scrapedData?.title || new URL(url).hostname;
        }

        finalContent = finalContent || '';
        finalTitle = finalTitle || new URL(url).hostname || 'Website Source';

        // Save knowledge to Firestore
        const knowledge = await addKnowledge(chatbotId, {
            type: 'website',
            content: finalContent,
            metadata: {
                url: url,
                title: finalTitle,
                scrapedAt: new Date().toISOString(),
                contentLength: (finalContent || '').length
            }
        });

        // Instant RAG indexing
        try {
            await indexKnowledgeItem(knowledge, { chatbot: ownershipResult.chatbot });
        } catch (indexErr) {
            console.error('[KNOWLEDGE-INDEX] Error indexing website knowledge:', indexErr);
        }

        return NextResponse.json(
            {
                success: true,
                data: knowledge,
                message: 'Website knowledge added and indexed successfully'
            },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error, 'adding website knowledge');
    }
}
