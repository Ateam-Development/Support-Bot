/**
 * Pinecone Vector Database REST API Integration
 * Light-weight REST client without heavy SDK dependencies
 */

function getPineconeApiKey() {
    return (process.env.PINECONE_API_KEY || '').trim();
}

function getPineconeIndexHost() {
    return (process.env.PINECONE_INDEX_HOST || '').trim();
}

/**
 * Check if Pinecone API key and Index Host are configured
 */
function isPineconeConfigured() {
    const key = getPineconeApiKey();
    const host = getPineconeIndexHost();
    return !!(key && host && key.length > 5 && !key.startsWith('your_'));
}

/**
 * Get sanitized Pinecone Index base URL
 */
function getIndexUrl() {
    let host = getPineconeIndexHost();
    if (!host) return '';
    if (!host.startsWith('http://') && !host.startsWith('https://')) {
        host = `https://${host}`;
    }
    return host.replace(/\/$/, '');
}

let cachedDimension = null;

/**
 * Fetch and cache the exact vector dimension of the configured Pinecone index
 */
async function getPineconeDimension() {
    if (cachedDimension) return cachedDimension;
    if (!isPineconeConfigured()) return 768;

    try {
        const indexUrl = getIndexUrl();
        const apiKey = getPineconeApiKey();
        const response = await fetch(`${indexUrl}/describe_index_stats`, {
            method: 'POST',
            headers: {
                'Api-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (response.ok) {
            const data = await response.json();
            if (data.dimension && typeof data.dimension === 'number') {
                cachedDimension = data.dimension;
                console.log(`[PINECONE] Detected Index vector dimension: ${cachedDimension}`);
                return cachedDimension;
            }
        }
    } catch (e) {
        console.warn('[PINECONE] Could not fetch index stats dimension:', e.message);
    }

    return 768;
}

/**
 * Adjust vector to target dimension (pad with 0s or truncate)
 */
function alignVectorDimension(vec, targetDim) {
    if (!vec || vec.length === 0) {
        const fallback = new Array(targetDim).fill(0);
        fallback[0] = 1.0;
        return fallback;
    }
    if (vec.length === targetDim) return vec;

    if (vec.length < targetDim) {
        const padded = [...vec];
        while (padded.length < targetDim) {
            padded.push(0);
        }
        return padded;
    }

    // Truncate and normalize
    return vec.slice(0, targetDim);
}

/**
 * Upsert vectors into Pinecone with auto-dimension alignment
 * @param {Array<{id: string, values: number[], metadata: object}>} vectors
 */
async function upsertPinecone(vectors) {
    if (!isPineconeConfigured()) {
        console.log('[PINECONE] Skipping Pinecone upsert: PINECONE_API_KEY or PINECONE_INDEX_HOST not set or placeholder in .env.local');
        return false;
    }
    if (!vectors || vectors.length === 0) {
        console.log('[PINECONE] Skipping Pinecone upsert: No vector embeddings generated.');
        return false;
    }

    try {
        const indexUrl = getIndexUrl();
        const apiKey = getPineconeApiKey();
        const targetDim = await getPineconeDimension();

        // Ensure all vector values match target index dimension
        const normalizedVectors = vectors.map(v => ({
            id: v.id,
            values: alignVectorDimension(v.values, targetDim),
            metadata: v.metadata || {}
        }));

        console.log(`[PINECONE] Upserting ${normalizedVectors.length} vectors (${targetDim}-dim) to Pinecone Index at ${indexUrl}...`);
        
        const response = await fetch(`${indexUrl}/vectors/upsert`, {
            method: 'POST',
            headers: {
                'Api-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ vectors: normalizedVectors })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[PINECONE] Upsert failed (${response.status}):`, errText);
            return false;
        }

        console.log(`[PINECONE] Successfully upserted ${normalizedVectors.length} vectors into Pinecone.`);
        return true;
    } catch (error) {
        console.error('[PINECONE] Error upserting vectors to Pinecone:', error);
        return false;
    }
}

/**
 * Query Pinecone vector database
 * @param {number[]} vector - Query embedding vector
 * @param {string} chatbotId - Chatbot scope filter
 * @param {Array<string>|null} allowedKnowledgeIds - Optional knowledge ID scope filter
 * @param {number} topK - Number of top matches to return
 */
async function queryPinecone(vector, chatbotId, allowedKnowledgeIds = null, topK = 10) {
    if (!isPineconeConfigured() || !vector || vector.length === 0) return [];

    try {
        const indexUrl = getIndexUrl();
        const apiKey = getPineconeApiKey();
        const targetDim = await getPineconeDimension();
        const normalizedVector = alignVectorDimension(vector, targetDim);

        const filter = { chatbotId: { "$eq": chatbotId } };
        if (allowedKnowledgeIds && allowedKnowledgeIds.length > 0) {
            filter.knowledgeId = { "$in": allowedKnowledgeIds };
        }

        const response = await fetch(`${indexUrl}/query`, {
            method: 'POST',
            headers: {
                'Api-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vector: normalizedVector,
                topK,
                includeMetadata: true,
                filter
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[PINECONE] Query failed (${response.status}):`, errText);
            return [];
        }

        const data = await response.json();
        return data.matches || [];
    } catch (error) {
        console.error('[PINECONE] Error querying vectors:', error);
        return [];
    }
}

/**
 * Delete vectors from Pinecone by knowledgeId filter
 * @param {string} knowledgeId
 */
async function deletePineconeByKnowledgeId(knowledgeId) {
    if (!isPineconeConfigured() || !knowledgeId) return false;

    try {
        const indexUrl = getIndexUrl();
        const response = await fetch(`${indexUrl}/vectors/delete`, {
            method: 'POST',
            headers: {
                'Api-Key': process.env.PINECONE_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filter: { knowledgeId: { "$eq": knowledgeId } }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[PINECONE] Delete failed (${response.status}):`, errText);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[PINECONE] Error deleting vectors:', error);
        return false;
    }
}

module.exports = {
    isPineconeConfigured,
    upsertPinecone,
    queryPinecone,
    deletePineconeByKnowledgeId
};
