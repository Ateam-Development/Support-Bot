import { NextResponse, after } from 'next/server';
import { getChatbotById, createConversation, addMessageToConversation, getConversationById, getConversationByVisitorId, updateConversation } from '@/lib/db';
import { addRealtimeMessage } from '@/lib/realtime-server';
import { sendEmail } from '@/lib/email';
import { getNotificationRecipients, isOwnerOnDashboard, appUrl, escapeHtml } from '@/lib/notify';
import { captureLeadFromMessage } from '@/lib/leads';

// One offline email per conversation per window, so a burst of messages doesn't flood the inbox
const OFFLINE_EMAIL_COOLDOWN_MS = 2 * 60 * 1000;

async function resolveConversation(chatbotId, conversationId, visitorId) {
    if (conversationId) {
        const conversation = await getConversationById(conversationId);
        if (conversation && conversation.chatbotId === chatbotId) return conversation;
    }
    if (visitorId) {
        const conversation = await getConversationByVisitorId(chatbotId, visitorId);
        if (conversation) return conversation;
    }
    return createConversation(chatbotId, null, visitorId);
}

/**
 * GET /api/widget/:chatbotId/live-chat?conversationId=...&visitorId=...
 * Live chat messages for the widget (polled; visitors can't read Realtime DB directly)
 */
export async function GET(request, { params }) {
    try {
        const { chatbotId } = await params;
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversationId');
        const visitorId = searchParams.get('visitorId');

        if (!conversationId) {
            return NextResponse.json({ success: true, data: { messages: [] } });
        }

        const conversation = await getConversationById(conversationId);
        const ownsConversation = conversation &&
            conversation.chatbotId === chatbotId &&
            (!String(conversation.visitorId || '').startsWith('visitor_') || conversation.visitorId === visitorId);

        if (!ownsConversation) {
            return NextResponse.json({ success: false, error: 'NotFound', message: 'Conversation not found' }, { status: 404 });
        }

        const messages = (conversation.messages || [])
            .filter(m => m.type === 'live')
            .map(m => ({
                id: `${m.timestamp}-${m.role}`,
                role: m.role,
                content: m.content || m.text || '',
                timestamp: m.timestamp
            }))
            .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

        return NextResponse.json(
            { success: true, data: { messages } },
            { headers: { 'Cache-Control': 'no-store' } }
        );
    } catch (error) {
        console.error('Live chat fetch error:', error);
        return NextResponse.json({ success: false, error: 'InternalError', message: 'Failed to load messages' }, { status: 500 });
    }
}

async function notifyOwnerIfAway(chatbot, conversation, message, visitorId) {
    const lastSent = conversation.lastOfflineEmailAt || 0;
    if (Date.now() - lastSent < OFFLINE_EMAIL_COOLDOWN_MS) return;

    if (await isOwnerOnDashboard(chatbot.userId)) {
        console.log(`[LIVE-CHAT] Dashboard is open for owner ${chatbot.userId}. Skipping offline email.`);
        return;
    }

    const emails = await getNotificationRecipients(chatbot);
    if (emails.length === 0) {
        console.warn(`[OFFLINE-EMAIL] No recipient for chatbot ${chatbot.id}; add a notification email in Settings.`);
        return;
    }

    const visitor = escapeHtml(conversation.visitorId || visitorId || 'Visitor');
    const subject = `[Live Support] New message on ${chatbot.name}`;
    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
            <h2 style="color: #2563eb;">New Live Chat Message</h2>
            <p>You received a live chat message on <strong>${escapeHtml(chatbot.name)}</strong> from <strong>${visitor}</strong> while you were away from the dashboard.</p>
            <blockquote style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; font-size: 15px; color: #1e293b;">
                ${escapeHtml(message)}
            </blockquote>
            <p style="color: #64748b; font-size: 13px;">
                Log in to your dashboard to view and reply to the visitor in real-time.
            </p>
            <a href="${appUrl(`/conversations/${chatbot.id}`)}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Open Conversation
            </a>
        </div>
    `;

    await sendEmail(emails, subject, html);
    await updateConversation(conversation.id, { lastOfflineEmailAt: Date.now() });
    console.log(`[OFFLINE-EMAIL] Sent to ${emails.join(', ')}`);
}

/**
 * POST /api/widget/:chatbotId/live-chat
 * Public endpoint for sending live chat messages from widget
 * No authentication required
 */
export async function POST(request, { params }) {
    try {
        const { chatbotId } = await params;
        const { message, conversationId, visitorId } = await request.json();

        if (!message) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Message is required' },
                { status: 400 }
            );
        }

        const [chatbot, conversation] = await Promise.all([
            getChatbotById(chatbotId),
            resolveConversation(chatbotId, conversationId, visitorId)
        ]);

        if (!chatbot) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Chatbot not found' },
                { status: 404 }
            );
        }

        const userMessage = {
            role: 'user',
            content: message,
            type: 'live', // This is a live chat message
            timestamp: new Date().toISOString()
        };

        // Realtime first-class: both writes in parallel for instant delivery
        await Promise.all([
            addMessageToConversation(conversation.id, userMessage),
            addRealtimeMessage(conversation.id, userMessage).catch(e => console.error('Realtime DB sync failed:', e))
        ]);

        // Email + lead capture run after the response is sent
        after(async () => {
            await Promise.allSettled([
                notifyOwnerIfAway(chatbot, conversation, message, visitorId),
                captureLeadFromMessage({ chatbot, conversation, message, source: 'live-chat' })
            ]).then(results => results.forEach(r => r.status === 'rejected' && console.error('[LIVE-CHAT] Background task failed:', r.reason)));
        });

        return NextResponse.json({
            success: true,
            data: {
                conversationId: conversation.id,
                visitorId: conversation.visitorId
            }
        });

    } catch (error) {
        console.error('Live chat error:', error);
        return NextResponse.json(
            { success: false, error: 'InternalError', message: 'Failed to process message' },
            { status: 500 }
        );
    }
}
