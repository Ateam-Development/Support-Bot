# Comprehensive Chatbot Backend Architecture & Upgrade Guide 🚀

This document provides a complete technical specification, backend structure breakdown, database schemas, API reference, and step-by-step migration guide for upgrading an older chatbot backend to the current high-performance architecture.

> [!IMPORTANT]
> **Scope**: This document covers **Backend Architecture**, **RAG Implementation**, **API & Knowledge Base Enhancements**, **Speed/Performance Optimizations**, **Chips Logic**, **Subscription Crons**, and **Environment Configurations**. Frontend UI styling, CSS, and colors are deliberately excluded.

---

## 📋 Table of Contents

1. [Architectural Overview & Backend Structure](#1-architectural-overview--backend-structure)
2. [Environment Variables & Configuration (`.env`)](#2-environment-variables--configuration-env)
3. [Database Schemas & Data Model](#3-database-schemas--data-model)
4. [Firestore Rules & Indexing Strategy](#4-firestore-rules--indexing-strategy)
5. [Advanced RAG Implementation (Retrieval-Augmented Generation)](#5-advanced-rag-implementation-retrieval-augmented-generation)
   - [Semantic Chunking](#semantic-chunking)
   - [Multi-Provider Vector Embeddings](#multi-provider-vector-embeddings)
   - [Pinecone Vector Database REST Integration](#pinecone-vector-database-rest-integration)
   - [Self-Healing Pinecone Sync & Fallback Strategy](#self-healing-pinecone-sync--fallback-strategy)
6. [Knowledge Base Enhancements & Scraping](#6-knowledge-base-enhancements--scraping)
   - [Firecrawl Scraping Integration](#firecrawl-scraping-integration)
   - [LLM Content Summarization & Formatting](#llm-content-summarization--formatting)
   - [Instant Indexing on Knowledge Ingestion](#instant-indexing-on-knowledge-ingestion)
7. [Sections, Tone Controls & Dynamic Scope Filtering](#7-sections-tone-controls--dynamic-scope-filtering)
8. [Dynamic Quick Response & Section Chips Logic](#8-dynamic-quick-response--section-chips-logic)
9. [Flow Engine & Interactive Decision Trees](#9-flow-engine--interactive-decision-trees)
10. [Speed, Performance & Realtime Dual Syncing](#10-speed-performance--realtime-dual-syncing)
11. [Automated Subscription Crons & Chatbot Lifecycle](#11-automated-subscription-crons--chatbot-lifecycle)
12. [API Endpoints Reference](#12-api-endpoints-reference)

---

## 1. Architectural Overview & Backend Structure

The system is built on **Next.js App Router API Routes (`app/api/`)**, providing serverless execution, zero CORS configuration requirements, and unified backend logic.

### Folder Hierarchy

```
├── app/api/                     # Next.js Serverless API Routes
│   ├── auth/                    # Auth verification and user management
│   ├── chat/                    # Primary chat & AI completion engine
│   ├── chatbots/                # Chatbot CRUD operations
│   ├── checkout/                # Razorpay/PayPal payment handlers
│   ├── conversations/           # Conversation management & live chat
│   ├── cron/                    # Vercel Cron jobs (subscription checks)
│   ├── flow/                    # Visual Flow Builder definition APIs
│   ├── knowledge/               # Knowledge base ingestion (File, Web, Text)
│   ├── sections/                # Chatbot sections & knowledge scoping
│   ├── settings/                # API keys & chatbot settings
│   └── widget/                  # Public widget APIs (config, messaging)
├── lib/                         # Core Backend Modules & Utilities
│   ├── api-utils.js             # Standardized error handling & ownership verification
│   ├── auth-middleware.js       # Firebase Token authentication middleware
│   ├── db.js                    # Primary Firestore database operations
│   ├── email.js                 # Nodemailer email notification client
│   ├── firebase-admin.js        # Firebase Admin SDK & Realtime DB initialization
│   ├── firebase-realtime.js     # User status & presence tracking
│   ├── firecrawl.js             # Firecrawl API web scraping client
│   ├── flow-engine.js           # Decision-tree dialogue state machine
│   ├── gemini.js                # Google Gemini API integration & retry logic
│   ├── pinecone.js              # Pinecone Vector DB REST API client
│   └── rag.js                   # RAG context retrieval & embedding pipeline
├── firestore.rules              # Firestore Security Rules
```

---

## 2. Environment Variables & Configuration (`.env`)

Create a `.env` file in the root directory containing the following configuration:

```env
# ==========================================
# Firebase Client Configuration (Public)
# ==========================================
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id.firebaseio.com

# ==========================================
# Firebase Admin SDK Configuration (Private)
# ==========================================
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
FIREBASE_DATABASE_URL=https://your_project_id.firebaseio.com

# Cron Job Security Secret
CRON_SECRET=your_secure_cron_secret

# ==========================================
# AI Provider API Keys
# ==========================================
GEMINI_API_KEY=your_gemini_api_key

# ==========================================
# Web Scraper API Keys
# ==========================================
FIRECRAWL_API_KEY=your_firecrawl_api_key

# ==========================================
# Vector Database (Pinecone)
# ==========================================
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_HOST=https://your-index-name.pinecone.io

# ==========================================
# Email SMTP Configuration (Nodemailer)
# ==========================================
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_app_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true

# ==========================================
# Application Base URLs
# ==========================================
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==========================================
# Payment Gateways
# ==========================================
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
```

---

## 3. Database Schemas & Data Model

The application uses **Cloud Firestore** for primary relational state and document storage.

### Collections Overview

1. `chatbots`: Primary configuration for individual bot instances.
2. `knowledge`: Raw ingested documents, web scrapes, and custom text.
3. `knowledge_chunks`: Text chunks with embedded vector representations.
4. `sections`: Categorized sub-spaces with specific knowledge bindings & tone controls.
5. `flows`: Visual dialogue graph definitions.
6. `conversations`: Conversation sessions and message histories.
7. `workspaces`: User subscription status, quota, and billing state.
8. `users`: User metadata, plan expiry, and account status.

#### Document Schemas

##### `chatbots/{chatbotId}`
```json
{
  "id": "string",
  "userId": "string",
  "name": "string",
  "primaryColor": "string",
  "welcomeMessage": "string",
  "theme": "string",
  "openaiApiKey": "string (optional)",
  "geminiApiKey": "string (optional)",
  "mistralApiKey": "string (optional)",
  "systemMessage": "string",
  "model": "string ('gemini' | 'openai' | 'mistral')",
  "disabled": "boolean",
  "notificationEmails": ["array of emails"],
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

##### `knowledge/{knowledgeId}`
```json
{
  "id": "string",
  "chatbotId": "string",
  "type": "string ('website' | 'file' | 'text')",
  "content": "string (cleaned & formatted text)",
  "metadata": {
    "url": "string (optional)",
    "title": "string (optional)",
    "fileName": "string (optional)"
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

##### `knowledge_chunks/{chunkId}`
```json
{
  "id": "string",
  "chatbotId": "string",
  "knowledgeId": "string",
  "content": "string (approx 1000 chars)",
  "embeddings": {
    "gemini": [ "float array" ],
    "openai": [ "float array" ],
    "mistral": [ "float array" ]
  },
  "createdAt": "Timestamp"
}
```

##### `sections/{sectionId}`
```json
{
  "id": "string",
  "chatbotId": "string",
  "name": "string",
  "description": "string",
  "sources": ["array of knowledgeIds"],
  "tone": "string ('Strict' | 'Neutral' | 'Friendly' | 'Empathetic')",
  "scope": {
    "allowed": ["array of allowed topics"],
    "blocked": ["array of forbidden topics"]
  },
  "createdAt": "Timestamp"
}
```

---

## 4. Firestore Rules & Indexing Strategy

### Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Conversations: Accessible by authenticated users or SDK
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null;
    }
    
    // Chatbots: Accessible by authenticated users
    match /chatbots/{chatbotId} {
      allow read, write: if request.auth != null;
    }

    // User accounts: Restricted to doc owner
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Public messages (e.g. contact form submissions)
    match /messages/{messageId} {
      allow create: if true;
      allow read, update, delete: if false;
    }
  }
}
```

### Index-Free Query Strategy
To avoid mandatory Firestore composite index deployment requirements during development and instant production deployment, queries rely on client-side and in-memory sorting:

```javascript
// Firestore query without requiring composite indexes
const snapshot = await firestore
    .collection('conversations')
    .where('chatbotId', '==', chatbotId)
    .get();

// Sort in-memory
const conversations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
conversations.sort((a, b) => b.updatedAt - a.updatedAt);
```

---

## 5. Advanced RAG Implementation (Retrieval-Augmented Generation)

The RAG pipeline is contained in `lib/rag.js` and `lib/pinecone.js`.

```
User Query ---> Semantic Embedding ---> Pinecone Vector Search (Top-K)
                                            │ (If 0 matches / missing vectors)
                                            ▼
                                Self-Healing Firestore Chunk Sync
                                            │
                                            ▼
                                In-Memory Cosine Similarity
                                            │
                                            ▼
                                Augmented LLM Prompt Completion
```

### Semantic Chunking
Splits long documents into chunks of ~1000 characters with 200-character overlaps, intelligently breaking on sentence boundaries (`\n\n`, `\n`, `. `, `? `, `! `):

```javascript
function chunkText(text, chunkSize = 1000, overlap = 200) {
    if (!text) return [];
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
```

### Multi-Provider Vector Embeddings
Supports Gemini (`gemini-embedding-001`), OpenAI (`text-embedding-3-small`), and Mistral (`mistral-embed`).

```javascript
async function getEmbedding(text, provider, apiKey) {
    if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: { parts: [{ text }] } })
        });
        const data = await response.json();
        return data.embedding.values;
    }
    // OpenAI and Mistral fetch implementations...
}
```

### Pinecone Vector Database REST Integration
Uses lightweight REST API calls without external SDK overhead (`lib/pinecone.js`):

```javascript
async function queryPinecone(vector, chatbotId, allowedKnowledgeIds = null, topK = 10) {
    if (!isPineconeConfigured()) return [];
    const indexUrl = getIndexUrl();
    const filter = { chatbotId: { "$eq": chatbotId } };
    if (allowedKnowledgeIds && allowedKnowledgeIds.length > 0) {
        filter.knowledgeId = { "$in": allowedKnowledgeIds };
    }

    const response = await fetch(`${indexUrl}/query`, {
        method: 'POST',
        headers: {
            'Api-Key': process.env.PINECONE_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vector, topK, includeMetadata: true, filter })
    });
    const data = await response.json();
    return data.matches || [];
}
```

### Self-Healing Pinecone Sync & Fallback Strategy
If Pinecone returns 0 matches but Firestore has indexed chunks, the system automatically performs a bulk-upsert sync to Pinecone in real time and re-executes the query. If Pinecone is unavailable, it gracefully falls back to Firestore in-memory Cosine Similarity.

---

## 6. Knowledge Base Enhancements & Scraping

### Firecrawl Scraping Integration (`lib/firecrawl.js`)
Uses Firecrawl to extract main markdown content directly from URLs while stripping out headers, footers, and sidebars:

```javascript
async function scrapeWebsite(url) {
    const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
        },
        body: JSON.stringify({ url, pageOptions: { onlyMainContent: true } })
    });
    const data = await response.json();
    return {
        title: data.data?.metadata?.title || 'Untitled',
        content: data.data?.content || '',
        markdown: data.data?.markdown || '',
        url
    };
}
```

### LLM Content Summarization & Formatting (`summarizeContentForChatbot`)
Raw scraped content or uploaded documents are formatted by an LLM before ingestion. The prompt explicitly instructs the model to preserve all factual data, pricing, and policies while removing website noise:

```javascript
const prompt = `Clean up, format, and structure the following scraped website content.
Remove all raw HTML, JavaScript, CSS code blocks, navigation menus, and boilerplate.
IMPORTANT: Do NOT cut, drop, summarize away, or omit any actual information, details, policies, prices, or services. Keep all real content completely intact.
Format cleanly using structured paragraphs, headers, and bullet points:\n\n${content}`;
```

### Instant Indexing on Knowledge Ingestion
When knowledge is saved, `indexKnowledgeItem()` immediately chunks text, computes embeddings, and stores vectors in both Firestore and Pinecone so knowledge is usable instantly.

---

## 7. Sections, Tone Controls & Dynamic Scope Filtering

Sections segment a chatbot's knowledge base into contextually scoped micro-domains.

### Tone Enforcement Rules
- **Strict**: Fact-based, strict adherence to knowledge, no small talk or guessing.
- **Neutral**: Professional, concise, direct.
- **Friendly**: Warm, conversational, helpful.
- **Empathetic**: Supportive, understanding, calming.

### Topic Guardrails (`allowed` & `blocked`)
Dynamic prompt injection enforces strict topic constraints based on the active section:

```javascript
if (activeSection.scope) {
    const allowed = activeSection.scope.allowed || [];
    const blocked = activeSection.scope.blocked || [];
    if (allowed.length > 0) {
        behaviorInstructions += `Allowed Topics (ONLY discuss these): ${allowed.join(', ')}. Politely decline others.\n`;
    }
    if (blocked.length > 0) {
        behaviorInstructions += `Blocked Topics (STRICTLY FORBIDDEN): ${blocked.join(', ')}. Decline politely.\n`;
    }
}
```

---

## 8. Dynamic Quick Response & Section Chips Logic

The system provides dynamic quick-response chips to guide user interactions.

```
Client Requests Config/Message ---> Backend returns active Sections & Flow Options
                                         │
                                         ▼
                                Rendered as Chips
                                         │
                                         ▼
                  User clicks Chip ---> Backend receives `sectionId` or `option`
                                         │
                                         ▼
                  `                      Narrowed RAG & Flow Branch
```

### Chip Data Generation Backend Endpoint
When fetching chatbot details or initiating chat widgets (`GET /api/sections/:chatbotId` & `GET /api/widget/:chatbotId/config`), available sections and suggested question chips are supplied in the response:

```json
{
  "success": true,
  "data": {
    "sections": [
      { "id": "sec_123", "name": "Pricing & Billing", "description": "Plans, subscriptions, & pricing" },
      { "id": "sec_456", "name": "Technical Support", "description": "Setup & troubleshooting" }
    ],
    "suggestedChips": [
      "What are your pricing plans?",
      "How do I setup the bot?",
      "Talk to human support"
    ]
  }
}
```

---

## 9. Flow Engine & Interactive Decision Trees

The dialogue machine (`lib/flow-engine.js`) evaluates tree nodes (`start`, `message`, `question`, `email`, `end`).

### Automatic Message Node Chaining
When a user interacts with a flow, the engine automatically traverses contiguous `message` nodes until it encounters an input step (`question` or `email`), combining responses for single-round delivery:

```javascript
while (currentNodeId) {
    const node = this.flow.nodes[currentNodeId];
    messages.push({ text: node.text, options: node.options || [], type: node.type });

    if (node.type === 'question' || node.type === 'email') break;
    if (node.type === 'end') { isComplete = true; break; }

    currentNodeId = node.next || null;
}
```

---

## 10. Speed, Performance & Realtime Dual Syncing

To eliminate chat widget latency and deliver instant updates to the live chat agent dashboard, messages are saved concurrently to Firestore and Firebase Realtime Database:

```javascript
// Parallelized sync to Firestore and Realtime Database
await Promise.all([
    addMessageToConversation(conversation.id, userMessage),
    syncToRealtimeDB(conversation.id, userMessage, chatbotId)
]);
```

### Realtime DB Sync Path Structure (`lib/widget/message/route.js`)
- Message content path: `conversations/{conversationId}/messages`
- Unread count & metadata: `conversations/{conversationId}/metadata`
- Global dashboard badge stats: `chatbots/{chatbotId}/stats`

---

## 11. Automated Subscription Crons & Chatbot Lifecycle

Located in `app/api/cron/check-subscriptions/route.js`.

### Key Features
1. **Parallelized Serverless Processing**: Iterates through all users concurrently with `Promise.all` to prevent function execution timeouts.
2. **Automatic Chatbot Disabling**: Chatbots belonging to users with expired packages (`daysLeft <= 0`) are automatically toggled to `disabled: true`.
3. **Automatic Chatbot Re-Enabling**: Renewing subscriptions immediately toggles `disabled: false` across all user chatbots.
4. **Email Reminders**: Sends urgency emails 2 days prior to expiration and immediately upon subscription expiry.

---

## 12. API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/chat/[chatbotId]` | Send chat message & trigger RAG pipeline | Optional |
| `POST` | `/api/widget/[chatbotId]/message` | Public widget message endpoint | Public |
| `GET` | `/api/widget/[chatbotId]/config` | Public chatbot widget configuration | Public |
| `GET` | `/api/sections/[chatbotId]` | List sections & scope rules for chatbot | Yes |
| `POST` | `/api/sections/[chatbotId]` | Create a new section | Yes |
| `POST` | `/api/knowledge/[chatbotId]/website` | Ingest website via Firecrawl scraper | Yes |
| `POST` | `/api/knowledge/[chatbotId]/file` | Ingest uploaded document content | Yes |
| `POST` | `/api/knowledge/[chatbotId]/text` | Ingest raw text knowledge | Yes |
| `GET` | `/api/cron/check-subscriptions` | Execute subscription check & chatbot enforcement | Bearer Cron Secret |

---

## 🎯 Summary Checklist for Upgrading Older Bots

1. **Environment Setup**: Copy key values from `.env` (Pinecone, Firecrawl, Gemini, Firebase Admin).
2. **Replace RAG Module**: Install `lib/rag.js` and `lib/pinecone.js`.
3. **Upgrade Ingestion**: Implement `lib/firecrawl.js` for web scraping and LLM formatting.
4. **Implement Dual Sync**: Update message creation to push concurrently to Firestore & Firebase Realtime DB.
5. **Add Section Guardrails**: Integrate `sections` schema into chat completion prompts.
6. **Set Up Subscription Cron**: Configure Vercel Cron to ping `/api/cron/check-subscriptions` daily.
