# 🚀 OneMinute Support — Next-Gen Autonomous AI & Live Chatbot Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=for-the-badge&logo=react)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.8%20Flash-4285F4?style=for-the-badge&logo=google)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai)
![Mistral AI](https://img.shields.io/badge/Mistral%20AI-Embed%20%26%20Chat-FF7000?style=for-the-badge&logo=mistral)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20RTDB-FFCA28?style=for-the-badge&logo=firebase)
![Pinecone](https://img.shields.io/badge/Pinecone-Vector%20DB-000000?style=for-the-badge)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)

<p align="center">
  <b>An enterprise-ready, hybrid AI + Human Support Agent platform with Visual Flow Builder, RAG Knowledge Base, Autonomous Lead Scoring, Anti-Collision Appointment Booking, and 1-Minute Website Widget Embedding.</b>
</p>

[✨ Superpowers](#-what-all-can-you-do-with-this-chatbot-superpowers) •
[🏗️ Architecture](#️-system-architecture) •
[⚡ Quick Start](#-quick-start-guide) •
[🔌 Embedding the Widget](#-embedding-the-widget-on-any-website) •
[📚 Complete Feature Tour](#-complete-feature-tour) •
[📡 API Reference](#-api-endpoints-reference)

---

</div>

## 🌟 What All Can You Do With This Chatbot? (Superpowers)

This is not just another basic wrapper around an LLM. It is a full-fledged customer acquisition, automated support, and live agent communication system designed to convert website traffic into qualified leads and scheduled appointments 24/7.

Here is everything you can do:

### 1. 🤖 Omnichannel Dual-Experience: AI + Human Live Agent
* **Dual-Tab Experience**: Visitors get a clean **Home (AI Assistant)** tab for instant 24/7 answers and an **Agent (Live Support)** tab for real human interaction.
* **Instant Human Agent Takeover**: Support teams can monitor conversations in real-time from the dashboard and jump into any conversation with a single click.
* **Realtime Presence & Heartbeat Tracking**: Shows whether agents or visitors are online, active, or idle in real time via Firebase Realtime Database.
* **Audio & Toast Notifications**: Sounds chime and instant toasts notify support agents whenever a user requests live help or sends a new message.

---

### 2. 🧠 Enterprise RAG (Retrieval-Augmented Generation) Knowledge Base
Feed your chatbot any source of knowledge so it answers with 100% accuracy based on your business data:
* **📄 Document & PDF Ingestion**: Drag & drop complex PDF documents and manuals. Text is extracted via `pdfjs-dist` and automatically indexed.
* **🌐 Automated Website Scraping**: Point the bot to your company website or docs URL. Powered by Firecrawl API, it crawls pages, extracts clean markdown, and uses LLMs to summarize dense content.
* **✍️ Custom Text & FAQs**: Add unstructured notes, FAQs, operating policies, and guidelines directly.
* **📐 Smart Semantic Chunking**: Text is split at natural boundaries (paragraphs, sentences) with 1000-character chunks and 200-character overlap to preserve semantic context.
* **⚡ Multi-Provider Vector Embeddings**: Connect Google Gemini (`gemini-embedding-001`), Mistral (`mistral-embed`), or OpenAI (`text-embedding-3-small`).
* **🛡️ Self-Healing Zero-Fail Fallback**: Includes a deterministic 768-dimensional unit-normalized embedding projection engine. If an API key expires or hits quota limits, your search and RAG **never crash**.
* **🌲 Pinecone Vector DB REST Integration**: Ultra-fast vector search with automatic fallback to Firestore in-memory cosine similarity search.

---

### 3. 🎨 Visual Drag-and-Drop Flow Builder
Design guided decision trees, onboarding sequences, and interactive questionnaires without writing a single line of code:
* **Visual Canvas**: Powered by ReactFlow with automatic layout algorithms (`dagre`).
* **Interactive Node Types**:
  * **Start Trigger**: Welcome trigger on conversation initiation.
  * **Message Node**: Informational messages that chain seamlessly.
  * **Question Node**: Multiple-choice or open-ended questions with condition-based conditional branch routes.
  * **Email Validation Node**: Regex email verification with custom retry prompts.
  * **Booking Node**: In-chat calendar slot selector.
  * **End Node**: Concludes the conversation or loops into AI free-chat mode.

---

### 4. 🗂️ Section Scoping & Dynamic Quick Chips
* **Section-Based Knowledge Scoping**: Group knowledge sources by topic (e.g., *Pricing*, *Refunds*, *Technical Specs*, *Company Policies*).
* **Dynamic Quick Response Chips**: Render interactive chips at the top of the chat widget. When clicked, the chatbot scopes its context exclusively to that section, eliminating hallucinations.

---

### 5. 💼 Autonomous Lead Qualification & Scoring
* **Contact Extraction**: Automatically parses emails and phone numbers from free-text chat and structured flow inputs without manual entry forms.
* **Buying Intent Classifier**: Detects high-conversion intent keywords (*"pricing"*, *"quote"*, *"cost"*, *"demo"*, *"book appointment"*, *"hire"*).
* **Automated Lead Scoring**:
  * 🔥 **HOT**: Phone or Booking + strong buying intent.
  * ⚡ **WARM**: Any captured email or phone number.
  * ❄️ **COLD**: General interest and casual inquiries.
* **Automated Email Alerts**: Delivers instant email notifications via Nodemailer to the admin inbox with one-click links to the customer's conversation.

---

### 6. 📅 Built-In Meeting & Appointment Scheduling
* **In-Chat Calendar Booking**: Customers can pick date and time slots right inside the chat bubble.
* **Anti-Collision Concurrency Guard**: Uses atomic document keys (`{chatbotId}_{date}_{HHMM}`) to guarantee two visitors can **never double-book** the same slot.
* **Fully Configurable Operations**:
  * Operating weekdays (e.g., Monday through Friday).
  * Shift hours (`startTime` & `endTime`).
  * Slot intervals (e.g., 15, 30, or 60 minutes).
  * Advance booking window (e.g., up to 7, 14, or 30 days ahead).
  * Timezone localization (e.g., `Asia/Kolkata`, `America/New_York`, `UTC`).
* **Bookings Dashboard**: View, filter, and manage upcoming client appointments.

---

### 7. 🤖 Multi-LLM Provider Engine (BYOK)
Switch models anytime or let your clients bring their own API keys:
* **Google Gemini**:
  * `gemini-3.8-flash` (Recommended — ultra fast & high intelligence)
  * `gemini-4-argon` (Flagship reasoning model with 1M context)
  * `gemini-3.1-pro-preview` / `gemini-3.5-flash-lite`
* **Mistral AI**:
  * `mistral-small-latest` (Free tier friendly)
  * `open-mistral-7b` / `mistral-large-latest`
* **OpenAI**:
  * `gpt-4o` / `gpt-4o-mini` / `gpt-3.5-turbo`
* **Custom System Prompts**: Customize personality, tone, language, and guidelines.

---

### 8. 🏷️ Full White-Labeling & Custom Widget Theming
* **One-Click Script Embed**: Embed on WordPress, Shopify, Webflow, Wix, or custom HTML.
* **Glassmorphic Modern UI**: High-end translucent dark & light themes with backdrop blur (`backdrop-filter`).
* **Color Accents**: Blue, Purple, Green, Orange, Red, or custom hex brand colors.
* **Agency Mode**: Remove the *"Powered by"* badge and replace it with your own agency name, logo, and website link.
* **Security Whitelist**: Lock chatbot execution to designated domain origins to prevent unauthorized iframe/script theft.

---

### 9. 📊 Interactive Analytics & Peak Traffic Heatmaps
* **Conversion Tracking**: Real-time stats on total conversations, unique leads, and booked appointments.
* **Temporal Bar Charts**: Visual 7-day, 30-day, and 90-day activity trends.
* **Peak Hour Heatmaps**: Identify when your visitors are most active so you can staff human agents at the right times.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["🌐 Client & Visitor Layer"]
        User["Website Visitor"]
        Widget["Chat Widget (Embed Script)"]
        User <--> Widget
        Widget -->|AI Tab| AIChat["AI Conversation Engine"]
        Widget -->|Live Tab| LiveChat["Live Agent Chat (Realtime)"]
    end

    subgraph BackendLayer["⚡ Next.js App Router API Routes"]
        APIChat["/api/chat & /api/widget/.../chat"]
        APILive["/api/widget/.../live-chat"]
        APIFlow["Flow Engine (flow-engine.js)"]
        APIRAG["RAG Pipeline (rag.js)"]
        APILeads["Lead Classifier (leads.js)"]
        APIBookings["Booking Lock (bookings.js)"]
    end

    subgraph KnowledgeLayer["📚 Knowledge & Vector Engine"]
        PDFParser["PDF Parser (pdfjs-dist)"]
        Crawler["Firecrawl Web Scraper"]
        SemanticChunker["Semantic Chunker"]
        Embeddings["Embedding Providers\n(Gemini / OpenAI / Mistral / Fallback)"]
        PineconeDB[("Pinecone Vector DB")]
        FirestoreVector[("Firestore Cosine Fallback")]
    end

    subgraph StorageLayer["🔥 Firebase Cloud Services"]
        FirebaseAuth["Firebase Authentication"]
        FirestoreDB[("Cloud Firestore\n(Configs, Chats, Leads, Bookings)")]
        RealtimeDB[("Firebase Realtime DB\n(Agent Presence & Live Messages)")]
    end

    subgraph AdminLayer["💻 Admin & Support Dashboard"]
        DashboardUI["Management Dashboard"]
        LiveConsole["Live Support Console\n(Realtime Takeover & Audio Alerts)"]
        FlowBuilder["Visual Flow Builder (ReactFlow)"]
        KBManager["Knowledge Base Manager"]
        AnalyticsView["Analytics & Conversion Charts"]
    end

    %% Connections
    AIChat --> APIChat
    LiveChat --> APILive
    APIChat --> APIFlow
    APIChat --> APIRAG
    APIChat --> APILeads
    APIChat --> APIBookings

    APIRAG --> SemanticChunker
    Crawler & PDFParser --> SemanticChunker
    SemanticChunker --> Embeddings
    Embeddings --> PineconeDB
    PineconeDB -.->|Fallback| FirestoreVector

    APILive <--> RealtimeDB
    APIChat <--> FirestoreDB
    DashboardUI <--> FirebaseAuth
    DashboardUI <--> FirestoreDB
    LiveConsole <--> RealtimeDB
    LiveConsole <--> FirestoreDB
```

---

## ⚡ Quick Start Guide

### Prerequisites
* **Node.js**: v18.17+ or v20+
* **Package Manager**: `npm`, `pnpm`, or `yarn`
* **Firebase Account**: Cloud Firestore & Realtime Database enabled
* **AI Provider API Key**: Google Gemini (Recommended & Free), OpenAI, or Mistral

---

### Step 1: Clone the Repository & Install Dependencies

```bash
cd dashboard

# Install all dependencies
npm install
```

---

### Step 2: Configure Environment Variables

Create `.env.local` inside the `dashboard/` directory by copying `.env.example`:

```bash
cp .env.example .env.local
```

Populate the required credentials:

```env
# ============================================================
# Firebase Client Configuration (Public)
# ============================================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/

# ============================================================
# Firebase Admin SDK (Private Service Account)
# ============================================================
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/

# ============================================================
# AI Provider Keys
# ============================================================
GEMINI_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-...
MISTRAL_API_KEY=...

# ============================================================
# Vector Database & Web Scraper (Optional)
# ============================================================
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_HOST=https://your-index.pinecone.io
FIRECRAWL_API_KEY=fc-...

# ============================================================
# Email Notification Alerts (Nodemailer SMTP)
# ============================================================
EMAIL_USER=notifications@yourdomain.com
EMAIL_APP_PASSWORD=your_smtp_app_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true

# ============================================================
# Application URLs
# ============================================================
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your_super_secure_cron_secret
```

---

### Step 3: Configure Firebase Security Rules

Deploy the included `firestore.rules` or paste the following into the **Firebase Console > Firestore Database > Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /chatbots/{chatbotId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /conversations/{conversationId} {
      allow read, write: if true;
    }
    match /knowledge/{knowledgeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /sections/{sectionId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /leads/{leadId} {
      allow read, write: if true;
    }
    match /bookings/{bookingId} {
      allow read, write: if true;
    }
  }
}
```

---

### Step 4: Run the Development Server

```bash
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🔌 Embedding the Widget on Any Website

You can embed this chatbot on any web page with just **one line of code**:

```html
<!-- OneMinute Support Widget -->
<script 
  src="https://your-dashboard-domain.com/widget.js" 
  data-id="YOUR_CHATBOT_ID" 
  defer>
</script>
```

### Framework Examples

#### Plain HTML
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Website</title>
</head>
<body>
    <h1>Welcome to My Store</h1>

    <!-- Chatbot Widget -->
    <script src="http://localhost:3000/widget.js" data-id="YOUR_CHATBOT_ID" defer></script>
</body>
</html>
```

#### Next.js / React
```jsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script 
          src="http://localhost:3000/widget.js" 
          data-id="YOUR_CHATBOT_ID" 
          strategy="lazyOnload" 
        />
      </body>
    </html>
  );
}
```

#### WordPress / Shopify / Webflow
1. Go to your site's **Theme Settings** or **Custom Code / Head & Body scripts**.
2. Paste the `<script>` tag before the closing `</body>` tag.
3. Save and publish. The floating bubble appears instantly!

---

## 📚 Complete Feature Tour

### 1. Visual Decision Tree Flow
* Go to **Flow** in the sidebar.
* Connect nodes to build guided paths:
  * Want to capture an email? Drag in an **Email Input** node.
  * Want users to book a demo? Drag in a **Booking** node.
  * Want to ask a multi-choice question? Drag in a **Question** node and create branches based on user answers!
* The Flow Engine automatically controls conversation state and hands off to RAG AI once the flow ends.

### 2. Knowledge Base & RAG Management
* Go to **Knowledge** in the sidebar.
* Click **Add Website** to deep-crawl your landing page or docs using Firecrawl.
* Click **Upload PDF** to ingest product sheets, user guides, or whitepapers.
* Click **Add Custom Text** for quick FAQs.
* All data is instantly chunked, converted to vector embeddings, and indexed for lightning-fast semantic search.

### 3. Live Chat & Agent Takeover
* Go to **Conversations** in the sidebar.
* View every live and AI chat stream in real time.
* Toggle the **Live Agent** switch to talk directly with the customer.
* When active, the visitor's widget switches seamlessly to live conversation mode.
* Real-time indicators show when visitors are typing.

### 4. Lead Capture & Intent Scoring
* Go to **Leads** in the sidebar.
* Inspect extracted leads with contact info, timestamp, conversation snippet, and lead temperature:
  * 🔥 **HOT**: User expressed high intent (e.g., requested pricing, booked an appointment, or asked for a callback).
  * ⚡ **WARM**: Contact details captured during chat.
  * ❄️ **COLD**: General query without high buying intent.
* Export leads or follow up immediately.

### 5. Appointments & Bookings
* Go to **Bookings** in the sidebar.
* View scheduled appointments across all chatbots.
* Customize booking slots per chatbot: set available days, shift times (e.g., 09:00 - 17:00), slot lengths, and timezones.

---

## 📡 API Endpoints Reference

### Public Widget Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/widget/[chatbotId]/config` | Fetches public theme, colors, name, sections, and start flow |
| `POST` | `/api/widget/[chatbotId]/chat` | Main AI chat completion, flow step execution, and RAG retrieval |
| `POST` | `/api/widget/[chatbotId]/live-chat` | Sends a message to the live human agent queue |
| `GET` | `/api/widget/[chatbotId]/live-chat` | Polls/subscribes to live conversation updates |

### Dashboard Management Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET/POST` | `/api/chatbots` | List all chatbots or create a new chatbot |
| `GET/PUT/DELETE` | `/api/chatbots/[id]` | Read, update configuration/keys, or delete a chatbot |
| `GET/POST` | `/api/knowledge/[chatbotId]` | List knowledge items or add raw text |
| `POST` | `/api/knowledge/[chatbotId]/file` | Upload and ingest PDF documents |
| `POST` | `/api/knowledge/[chatbotId]/website` | Crawl and ingest website URLs |
| `GET/POST` | `/api/sections/[chatbotId]` | List or create scoped knowledge sections |
| `GET/POST` | `/api/flow/[chatbotId]` | Read or save visual ReactFlow conversation graph |
| `GET` | `/api/leads/[chatbotId]` | Retrieve captured and qualified leads |
| `GET` | `/api/bookings/[chatbotId]` | Retrieve confirmed calendar bookings |
| `GET` | `/api/analytics/[chatbotId]` | Retrieve conversation, lead, and hourly analytics |

---

## 📂 Project Directory Structure

```
Chatbot/
├── dashboard/                           # Next.js Fullstack Dashboard & Widget App
│   ├── app/                             # Next.js App Router
│   │   ├── (dashboard)/                 # Authenticated Dashboard Routes
│   │   │   ├── analytics/[id]/          # Performance analytics & hourly charts
│   │   │   ├── bookings/[id]/           # Calendar appointments & slots
│   │   │   ├── chatbot/[id]/            # AI model selection, theme & API keys
│   │   │   ├── conversations/[id]/      # Live chat console & agent takeover
│   │   │   ├── flow/[chatbotId]/        # Visual ReactFlow canvas builder
│   │   │   ├── knowledge/[id]/          # File, Web, & Text RAG ingestion
│   │   │   ├── leads/[id]/              # Lead CRM & intent scoring table
│   │   │   ├── sections/[id]/           # Scoped knowledge sections & chips
│   │   │   └── settings/[id]/           # Workspace settings & domain origins
│   │   ├── api/                         # 25+ Serverless API Endpoints
│   │   │   ├── chatbots/                # Chatbot CRUD
│   │   │   ├── conversations/           # Message history & live chat
│   │   │   ├── knowledge/               # RAG ingestion endpoints
│   │   │   ├── flow/                    # Visual flow save/load
│   │   │   ├── leads/ & bookings/       # CRM & booking APIs
│   │   │   └── widget/                  # Embeddable widget public APIs
│   │   ├── login/                       # User authentication
│   │   └── widget/[id]/                 # Hosted standalone widget frame
│   ├── components/                      # React UI Components
│   │   ├── conversations/               # Live chat thread, message list, takeover
│   │   ├── flow/                        # Custom ReactFlow nodes & edge components
│   │   ├── knowledge/                   # Ingestion modals (PDF, Firecrawl, Text)
│   │   ├── widget/                      # ChatWidget.jsx & responsive widget CSS
│   │   ├── DashboardPresence.jsx        # Agent realtime heartbeat monitor
│   │   └── NotificationListener.jsx     # Audio chime & toast event listener
│   ├── lib/                             # Core Backend Engines
│   │   ├── bookings.js                  # Atomic anti-collision booking scheduler
│   │   ├── email.js                     # Nodemailer SMTP alert client
│   │   ├── firebase-admin.js            # Firebase Admin SDK & Realtime DB
│   │   ├── firebase-realtime.js         # Realtime presence & typing state
│   │   ├── firecrawl.js                 # Firecrawl web scraping client
│   │   ├── flow-engine.js               # State machine dialogue tree engine
│   │   ├── gemini.js                    # Google Gemini API client & retries
│   │   ├── leads.js                     # Intent classifier & lead qualification
│   │   ├── pinecone.js                  # Pinecone Vector DB REST client
│   │   ├── rag.js                       # Semantic chunking & multi-provider RAG
│   │   └── widget-snippet.js            # Embed snippet generator
│   ├── public/                          # Public Assets & Static Files
│   │   ├── test-widget.html             # Local HTML widget test page
│   │   └── widget.js                    # Universal embeddable widget loader
│   ├── firestore.rules                  # Firebase Firestore Security Rules
│   └── package.json                     # Dependencies & scripts
└── README.md                            # Comprehensive Platform Documentation
```

---

## 🛠️ Tech Stack & Key Libraries

| Technology | Role |
| :--- | :--- |
| **Next.js 16 (App Router)** | Full-stack serverless framework & API routes |
| **React 19** | Modern UI rendering & reactive state management |
| **Tailwind CSS v4** | Next-generation styling engine |
| **Firebase Firestore** | NoSQL database for chatbots, chats, knowledge & leads |
| **Firebase Realtime DB** | Sub-millisecond live chat synchronization & presence tracking |
| **Google Gemini API** | Primary LLM engine (`gemini-3.8-flash`, `gemini-4-argon`) |
| **OpenAI & Mistral APIs** | Alternative LLM providers for BYOK flexibility |
| **Pinecone Vector DB** | High-dimensional vector indexing & semantic search |
| **Firecrawl API** | Deep website crawling and clean markdown extraction |
| **pdfjs-dist** | Server-side PDF parsing and text extraction |
| **ReactFlow & Dagre** | Visual node graph canvas & automatic diagram layout |
| **Framer Motion** | Polished micro-interactions & widget animations |
| **Nodemailer** | Instant lead and booking email notifications |
| **Sonner** | Modern toast notification alerts |

---

## 🔒 Security & Privacy Best Practices

1. **API Keys Stored Server-Side**: Client applications and visitors never see your Gemini, OpenAI, Mistral, or Pinecone keys. All AI calls run securely via Next.js serverless functions.
2. **Domain Origin Restriction**: Protect your widget script from being embedded on unauthorized third-party websites by configuring allowed origins in **Settings**.
3. **Atomic Concurrency Protection**: Appointment bookings utilize transactional document keys to prevent double-booking collisions under high traffic.
4. **Resilient Offline Embedding Fallback**: If an external AI provider experiences an outage, the self-healing embedding fallback keeps your chatbot operating without downtime.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ by Pranjal & the Adeptimize Team.</sub>
</div>
