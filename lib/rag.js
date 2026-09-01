/**
 * RAG (Retrieval-Augmented Generation) Implementation
 * Semantic Chunking, Multi-Provider Vector Embeddings (Gemini, OpenAI, Mistral),
 * Pinecone Vector Database & In-Memory Fallbacks
 */

const { getFirestore, admin } = require('./firebase-admin');
const { isPineconeConfigured, upsertPinecone, queryPinecone, deletePineconeByKnowledgeId } = require('./pinecone');

/**
 * Split text into semantic chunks (~1000 chars, 200 overlap) breaking at natural boundaries
 * @param {string} text
 * @param {number} chunkSize
 * @param {number} overlap
 * @returns {string[]}
 */
function chunkText(text, chunkSize = 1000, overlap = 200) {
    if (!text || typeof text !== 'string') return [];
    text = text.replace(/\r\n/g, '\n');
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;
        if (end < text.length) {
            const lookback = text.substring(Math.max(start, end - 150), end);
            const boundaryIndex = Math.max(
                lookback.lastIndexOf('\n\n'),
                lookback.lastIndexOf('\n'),
                lookback.lastIndexOf('. '),
                lookback.lastIndexOf('? '),
                lookback.lastIndexOf('! ')
            );

            if (boundaryIndex !== -1) {
                const lookbackStart = Math.max(start, end - 150);
                end = (lookback.charAt(boundaryIndex) === '\n')
                    ? lookbackStart + boundaryIndex
                    : lookbackStart + boundaryIndex + 1;
            }
        } else {
            end = text.length;
        }

        const chunk = text.substring(start, end).trim();
        if (chunk) chunks.push(chunk);

        start = end - overlap;
        if (start >= text.length || end >= text.length) break;
    }

    return chunks;
}

/**
 * Generate a deterministic dense vector embedding using hashing & n-gram feature projections.
 * Guarantees that every chunk and text query ALWAYS produces a valid unit-normalized float vector
 * even when no external LLM API key is present or when API quota is exhausted.
 * @param {string} text
 * @param {number} dimension
 * @returns {number[]}
 */
function generateDeterministicEmbedding(text, dimension = 768) {
    if (!text || !text.trim()) {
        const vec = new Array(dimension).fill(0);
        vec[0] = 1.0;
        return vec;
    }

    const vector = new Array(dimension).fill(0);
    const cleaned = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    const words = cleaned.split(/\s+/).filter(Boolean);

    // 1. Hash word unigrams & bigrams
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        let hash = 5381;
        for (let j = 0; j < word.length; j++) {
            hash = ((hash << 5) + hash) + word.charCodeAt(j);
            hash = hash & hash;
        }

        const idx = Math.abs(hash) % dimension;
        vector[idx] += 1.0;

        if (i < words.length - 1) {
            const bigram = word + '_' + words[i + 1];
            let biHash = 5381;
            for (let j = 0; j < bigram.length; j++) {
                biHash = ((biHash << 5) + biHash) + bigram.charCodeAt(j);
                biHash = biHash & biHash;
            }
            const biIdx = Math.abs(biHash) % dimension;
            vector[biIdx] += 1.5;
        }
    }

    // 2. Character trigrams for morphological robustness
    for (let i = 0; i < cleaned.length - 2; i += 2) {
        const trigram = cleaned.substring(i, i + 3);
        let triHash = 0;
        for (let j = 0; j < trigram.length; j++) {
            triHash = ((triHash << 5) - triHash) + trigram.charCodeAt(j);
            triHash |= 0;
        }
        const triIdx = Math.abs(triHash) % dimension;
        vector[triIdx] += 0.5;
    }

    // 3. Normalize to unit vector (L2 norm) for cosine similarity & Pinecone
    let norm = 0;
    for (let i = 0; i < dimension; i++) {
        norm += vector[i] * vector[i];
    }

    norm = Math.sqrt(norm);
    if (norm > 0) {
        for (let i = 0; i < dimension; i++) {
            vector[i] = parseFloat((vector[i] / norm).toFixed(6));
        }
    } else {
        vector[0] = 1.0;
    }

    return vector;
}

/**
 * Get vector embedding for a text string using multi-provider support with automatic fallback
 * @param {string} text
 * @param {object|string} providerOrChatbot - Provider string or Chatbot object
 * @param {string} customApiKey - Optional custom API key
 * @returns {Promise<number[]>}
 */
async function getEmbedding(text, providerOrChatbot = 'gemini', customApiKey = null) {
    if (!text || !text.trim()) return generateDeterministicEmbedding('', 768);

    let chatbot = {};
    let provider = 'gemini';

    if (typeof providerOrChatbot === 'object' && providerOrChatbot !== null) {
        chatbot = providerOrChatbot;
        provider = (chatbot.provider || chatbot.model || 'gemini').toLowerCase();
    } else if (typeof providerOrChatbot === 'string') {
        provider = providerOrChatbot.toLowerCase();
    }

    if (provider.startsWith('gpt') || provider === 'chatgpt') provider = 'openai';

    // Provider 1: Gemini
    const geminiKey = customApiKey || chatbot.geminiApiKey || process.env.GEMINI_API_KEY;
    if (provider === 'gemini' && geminiKey && geminiKey.trim().length > 5 && !geminiKey.startsWith('your_')) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey.trim()}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: { parts: [{ text }] }
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.embedding?.values) return data.embedding.values;
            }
        } catch (err) {
            console.warn('[RAG-EMBED] Gemini embedding failed, attempting fallback:', err.message);
        }
    }

    // Provider 2: Mistral
    const mistralKey = customApiKey || chatbot.mistralApiKey || process.env.MISTRAL_API_KEY;
    if (mistralKey && mistralKey.trim().length > 5 && !mistralKey.startsWith('your_')) {
        try {
            const response = await fetch('https://api.mistral.ai/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mistralKey.trim()}`
                },
                body: JSON.stringify({
                    input: [text],
                    model: 'mistral-embed'
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data?.[0]?.embedding) return data.data[0].embedding;
            } else {
                const errText = await response.text().catch(() => '');
                console.warn(`[RAG-EMBED] Mistral embedding failed (${response.status}):`, errText);
            }
        } catch (err) {
            console.warn('[RAG-EMBED] Mistral embedding exception, attempting fallback:', err.message);
        }
    }

    // Provider 3: OpenAI
    const openAiKey = customApiKey || chatbot.openaiApiKey || process.env.OPENAI_API_KEY;
    if (openAiKey && openAiKey.trim().length > 5 && !openAiKey.startsWith('your_')) {
        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openAiKey.trim()}`
                },
                body: JSON.stringify({
                    input: text,
                    model: 'text-embedding-3-small'
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data?.[0]?.embedding) return data.data[0].embedding;
            }
        } catch (err) {
            console.warn('[RAG-EMBED] OpenAI embedding failed, attempting fallback:', err.message);
        }
    }

    // Final Attempt: Gemini default if any key available
    if (geminiKey && geminiKey.trim().length > 5 && !geminiKey.startsWith('your_')) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey.trim()}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: { parts: [{ text }] } })
            });
            if (response.ok) {
                const data = await response.json();
                if (data.embedding?.values) return data.embedding.values;
            }
        } catch (e) {
            // ignore
        }
    }

    // Universal Fallback: Deterministic Dense Vector Embedding
    // Guarantees Pinecone always receives valid vectors and saves all chunks without dropping data
    console.log('[RAG-EMBED] Generating deterministic dense vector embedding for Pinecone...');
    return generateDeterministicEmbedding(text, 768);
}

/**
 * Calculate Cosine Similarity between two numerical vectors
 */
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Index a knowledge document by chunking, generating embeddings, and storing in Firestore & Pinecone
 * @param {object} knowledgeItem - Document from `knowledge` collection
 * @param {object} options - Optional { chatbot, provider, apiKey }
 */
async function indexKnowledgeItem(knowledgeItem, options = {}) {
    if (!knowledgeItem || !knowledgeItem.content) return;

    const firestore = getFirestore();
    const { id: knowledgeId, chatbotId, content } = knowledgeItem;

    // Load chatbot configuration if not provided in options
    let chatbot = options.chatbot || {};
    if (!chatbot.id && chatbotId) {
        try {
            const chatbotDoc = await firestore.collection('chatbots').doc(chatbotId).get();
            if (chatbotDoc.exists) {
                chatbot = { id: chatbotDoc.id, ...chatbotDoc.data() };
            }
        } catch (e) {
            console.warn('[RAG-INDEX] Could not load chatbot config from DB:', e.message);
        }
    }

    const provider = options.provider || chatbot.provider || chatbot.model || 'gemini';
    const apiKey = options.apiKey || null;

    // 1. Chunk content
    const chunks = chunkText(content, 1000, 200);
    if (chunks.length === 0) return;

    console.log(`[RAG-INDEX] Indexing knowledgeId=${knowledgeId} for chatbotId=${chatbotId} into ${chunks.length} chunks.`);

    // 2. Generate embeddings & save to Firestore `knowledge_chunks`
    const batch = firestore.batch();
    const pineconeVectors = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        const chunkRef = firestore.collection('knowledge_chunks').doc();

        let embedding = [];
        try {
            embedding = await getEmbedding(chunkContent, chatbot, apiKey);
        } catch (embedErr) {
            console.error(`[RAG-INDEX] Failed embedding chunk ${i}:`, embedErr.message);
        }

        const chunkDoc = {
            id: chunkRef.id,
            chatbotId,
            knowledgeId,
            content: chunkContent,
            embeddings: {
                [provider]: embedding,
                primary: embedding
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        batch.set(chunkRef, chunkDoc);

        if (embedding && embedding.length > 0) {
            pineconeVectors.push({
                id: chunkRef.id,
                values: embedding,
                metadata: {
                    chatbotId,
                    knowledgeId,
                    content: chunkContent.substring(0, 1000)
                }
            });
        }
    }

    await batch.commit();
    console.log(`[RAG-INDEX] Saved ${chunks.length} chunks to Firestore for knowledgeId=${knowledgeId}. (Generated ${pineconeVectors.length} vector embeddings)`);

    // 3. Upsert to Pinecone if configured
    if (isPineconeConfigured()) {
        if (pineconeVectors.length > 0) {
            try {
                await upsertPinecone(pineconeVectors);
            } catch (pineErr) {
                console.warn('[RAG-INDEX] Pinecone upsert failed, continuing with Firestore chunks fallback:', pineErr.message);
            }
        } else {
            console.log('[RAG-INDEX] No vector embeddings were generated for Pinecone. Chunks stored in Firestore for fallback.');
        }
    } else {
        console.log('[RAG-INDEX] Pinecone not configured in environment (PINECONE_API_KEY/PINECONE_INDEX_HOST). Stored in Firestore.');
    }
}

/**
 * Delete index data for a given knowledge ID from Firestore and Pinecone
 * @param {string} knowledgeId
 */
async function deleteKnowledgeItemIndex(knowledgeId) {
    if (!knowledgeId) return;

    const firestore = getFirestore();

    // 1. Delete Firestore chunks
    const snapshot = await firestore
        .collection('knowledge_chunks')
        .where('knowledgeId', '==', knowledgeId)
        .get();

    if (!snapshot.empty) {
        const batch = firestore.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`[RAG-INDEX] Deleted ${snapshot.size} chunks from Firestore for knowledgeId=${knowledgeId}.`);
    }

    // 2. Delete from Pinecone
    if (isPineconeConfigured()) {
        try {
            await deletePineconeByKnowledgeId(knowledgeId);
        } catch (pineErr) {
            console.warn('[RAG-INDEX] Pinecone deletion error:', pineErr.message);
        }
    }
}

/**
 * Retrieve context chunks for a given query using Pinecone search with Self-Healing sync & In-Memory Fallback
 * @param {string} chatbotId
 * @param {string} query
 * @param {object} options - { allowedKnowledgeIds: string[], topK: number, provider: string, apiKey: string }
 * @returns {Promise<Array<{content: string, score: number, knowledgeId: string}>>}
 */
async function retrieveContext(chatbotId, query, options = {}) {
    if (!query || !query.trim() || !chatbotId) return [];

    const { allowedKnowledgeIds = null, topK = 5, provider = 'gemini', apiKey = null } = options;
    const firestore = getFirestore();

    // 1. Generate query embedding vector
    let queryEmbedding = [];
    try {
        queryEmbedding = await getEmbedding(query, provider, apiKey);
    } catch (err) {
        console.error('[RAG-RETRIEVE] Failed to generate query embedding:', err.message);
    }

    let results = [];

    // 2. Try Pinecone REST search if configured and query embedding exists
    if (isPineconeConfigured() && queryEmbedding.length > 0) {
        try {
            const pineconeMatches = await queryPinecone(queryEmbedding, chatbotId, allowedKnowledgeIds, topK);

            if (pineconeMatches && pineconeMatches.length > 0) {
                results = pineconeMatches.map(match => ({
                    content: match.metadata?.content || '',
                    score: match.score || 0,
                    knowledgeId: match.metadata?.knowledgeId || ''
                }));
                console.log(`[RAG-RETRIEVE] Retrieved ${results.length} matches from Pinecone.`);
                return results;
            }
        } catch (pineErr) {
            console.warn('[RAG-RETRIEVE] Pinecone query error, falling back to Firestore:', pineErr.message);
        }
    }

    // 3. Fallback Strategy: In-Memory Cosine Similarity on Firestore chunks
    console.log(`[RAG-RETRIEVE] Using Firestore chunks retrieval for chatbotId=${chatbotId}...`);

    let chunksSnapshot = await firestore
        .collection('knowledge_chunks')
        .where('chatbotId', '==', chatbotId)
        .get();

    if (chunksSnapshot.empty) return [];

    let chunkDocs = chunksSnapshot.docs.map(doc => doc.data());

    if (allowedKnowledgeIds && allowedKnowledgeIds.length > 0) {
        chunkDocs = chunkDocs.filter(chunk => allowedKnowledgeIds.includes(chunk.knowledgeId));
    }

    const scoredChunks = [];

    for (const chunk of chunkDocs) {
        const chunkVector = chunk.embeddings?.primary || chunk.embeddings?.[provider] || chunk.embeddings?.gemini || [];
        let score = 0;

        if (queryEmbedding.length > 0 && chunkVector.length > 0 && queryEmbedding.length === chunkVector.length) {
            score = cosineSimilarity(queryEmbedding, chunkVector);
        } else {
            // Keyword matching fallback if dimensions mismatch or vector absent
            const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            const contentLower = (chunk.content || '').toLowerCase();
            let matchCount = 0;
            words.forEach(w => { if (contentLower.includes(w)) matchCount++; });
            score = matchCount / Math.max(words.length, 1);
        }

        if (score > 0) {
            scoredChunks.push({
                content: chunk.content,
                score,
                knowledgeId: chunk.knowledgeId
            });
        }
    }

    scoredChunks.sort((a, b) => b.score - a.score);
    results = scoredChunks.slice(0, topK);

    console.log(`[RAG-RETRIEVE] Fallback retrieved ${results.length} relevant context chunks.`);
    return results;
}

module.exports = {
    chunkText,
    getEmbedding,
    cosineSimilarity,
    indexKnowledgeItem,
    deleteKnowledgeItemIndex,
    retrieveContext
};
