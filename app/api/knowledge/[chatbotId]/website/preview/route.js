const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');
const { scrapeWebsite, isFirecrawlConfigured } = require('@/lib/firecrawl');
const { cleanAndFormatContent } = require('@/lib/llm');

/**
 * POST /api/knowledge/:chatbotId/website/preview
 * Crawl website and format content for user preview & editing before saving to Knowledge Base
 */
export async function POST(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { user } = authResult;
        const { chatbotId } = await params;
        const { url } = await request.json();

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

        // 1. Scrape the website via Firecrawl
        let scrapedData;
        try {
            scrapedData = await scrapeWebsite(url);
        } catch (error) {
            return NextResponse.json(
                { success: false, error: 'ScrapingError', message: `Failed to scrape website: ${error.message}` },
                { status: 500 }
            );
        }

        // 2. Clean, format, and structure raw content using the chatbot's configured AI key
        const rawContent = (scrapedData && (scrapedData.markdown || scrapedData.content)) || '';
        let cleanedContent = rawContent;
        try {
            const formatted = await cleanAndFormatContent(rawContent, ownershipResult.chatbot);
            if (formatted && typeof formatted === 'string') {
                cleanedContent = formatted;
            }
        } catch (formatErr) {
            console.warn('[CRAWL-PREVIEW] Formatting fallback to raw content:', formatErr.message);
        }

        cleanedContent = cleanedContent || rawContent || '';
        const title = scrapedData?.title || new URL(url).hostname || 'Website Document';

        return NextResponse.json({
            success: true,
            data: {
                url,
                title,
                content: cleanedContent,
                rawLength: (rawContent || '').length,
                contentLength: (cleanedContent || '').length
            },
            message: 'Website scraped and structured successfully for review'
        });
    } catch (error) {
        return handleApiError(error, 'crawling website preview');
    }
}
