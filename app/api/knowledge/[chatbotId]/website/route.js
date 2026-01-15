const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { addKnowledge } = require('@/lib/db');
const { verifyChatbotOwnership, handleApiError } = require('@/lib/api-utils');
const { scrapeWebsite, isFirecrawlConfigured } = require('@/lib/firecrawl');
const { summarizeContent, isGeminiConfigured } = require('@/lib/gemini');

/**
 * POST /api/knowledge/:chatbotId/website
 * Add website URL to knowledge base with Firecrawl scraping and Gemini summarization
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
        const { url } = await request.json();

        // Verify ownership
        const ownershipResult = await verifyChatbotOwnership(chatbotId, user.uid);
        if (ownershipResult.error) {
            return ownershipResult.error;
        }

        if (!url) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'BadRequest',
                    message: 'URL is required'
                },
                { status: 400 }
            );
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (e) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'BadRequest',
                    message: 'Invalid URL format'
                },
                { status: 400 }
            );
        }

        // Check if Firecrawl is configured
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

        // Scrape the website
        let scrapedData;
        try {
            scrapedData = await scrapeWebsite(url);
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'ScrapingError',
                    message: `Failed to scrape website: ${error.message}`
                },
                { status: 500 }
            );
        }

        // Summarize the content
        let summary;
        try {
            summary = await summarizeContent(scrapedData.content, 'website');
        } catch (error) {
            console.error('Summarization error:', error);
            // If summarization fails, use truncated content as fallback
            summary = scrapedData.content.substring(0, 500) + '...';
        }

        // Save to database
        const knowledge = await addKnowledge(chatbotId, {
            type: 'website',
            content: scrapedData.content,
            summary: summary,
            metadata: {
                url: url,
                title: scrapedData.title,
                scrapedAt: new Date().toISOString(),
                contentLength: scrapedData.content.length
            }
        });

        return NextResponse.json(
            {
                success: true,
                data: knowledge,
                message: 'Website scraped and added successfully'
            },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error, 'adding website knowledge');
    }
}

