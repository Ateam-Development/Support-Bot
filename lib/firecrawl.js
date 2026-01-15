/**
 * Firecrawl API Integration
 * Used for scraping website content
 */

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v0/scrape';

/**
 * Check if Firecrawl API key is configured
 */
function isFirecrawlConfigured() {
    return !!FIRECRAWL_API_KEY;
}

/**
 * Scrape a website URL using Firecrawl
 * @param {string} url - The URL to scrape
 * @returns {Promise<{title: string, content: string, markdown: string, url: string}>}
 */
async function scrapeWebsite(url) {
    if (!FIRECRAWL_API_KEY) {
        throw new Error('Firecrawl API key is not configured. Please add FIRECRAWL_API_KEY to your environment variables.');
    }

    try {
        const response = await fetch(FIRECRAWL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
            },
            body: JSON.stringify({
                url,
                pageOptions: {
                    onlyMainContent: true
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Firecrawl API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to scrape website');
        }

        return {
            title: data.data?.metadata?.title || 'Untitled',
            content: data.data?.content || '',
            markdown: data.data?.markdown || '',
            url: url
        };
    } catch (error) {
        console.error('Firecrawl scraping error:', error);
        throw error;
    }
}

module.exports = {
    isFirecrawlConfigured,
    scrapeWebsite
};

