import { NextResponse } from 'next/server';
import { getChatbotById, createConversation, addMessageToConversation, getConversationById, getConversationByVisitorId } from '@/lib/db';
import { addRealtimeMessage } from '@/lib/firebase-realtime';
import { getRealtimeDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email';

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

        // Get chatbot configuration
        const chatbot = await getChatbotById(chatbotId);

        if (!chatbot) {
            return NextResponse.json(
                { success: false, error: 'NotFound', message: 'Chatbot not found' },
                { status: 404 }
            );
        }

        // Get or create conversation
        let conversation;
        if (conversationId) {
            conversation = await getConversationById(conversationId);
            if (!conversation || conversation.chatbotId !== chatbotId) {
                // Invalid conversation ID, try finding by visitorId if available
                if (visitorId) {
                    conversation = await getConversationByVisitorId(chatbotId, visitorId);
                }

                // If still no conversation, create new one
                if (!conversation) {
                    conversation = await createConversation(chatbotId, null, visitorId);
                }
            }
        } else {
            // No ID provided, try finding existing active conversation by visitorId
            if (visitorId) {
                conversation = await getConversationByVisitorId(chatbotId, visitorId);
            }

            // Create new if none found
            if (!conversation) {
                conversation = await createConversation(chatbotId, null, visitorId);
            }
        }

        // Add user message to conversation
        const userMessage = {
            role: 'user',
            content: message,
            type: 'live', // This is a live chat message
            timestamp: new Date().toISOString()
        };
        await addMessageToConversation(conversation.id, userMessage);

        // Sync to Realtime DB for instant delivery
        try {
            await addRealtimeMessage(conversation.id, userMessage);
        } catch (e) {
            console.error('Realtime DB sync failed:', e);
        }

        // Check for offline email notification: Only send if dashboard is NOT live / opened
        try {
            let isDashboardLive = false;

            if (chatbot.userId) {
                try {
                    const rtdb = getRealtimeDb();
                    if (rtdb) {
                        const presenceSnap = await rtdb.ref(`presence/${chatbot.userId}`).once('value');
                        const ownerStatus = presenceSnap.val();
                        if (ownerStatus) {
                            const lastSeenDiff = Date.now() - (ownerStatus.lastSeen || 0);
                            // Online if flag is true and updated within last 60 seconds
                            if (ownerStatus.online === true && lastSeenDiff < 60 * 1000) {
                                isDashboardLive = true;
                            }
                        }
                    }
                } catch (presenceErr) {
                    console.warn('[PRESENCE-CHECK] Error checking dashboard presence:', presenceErr.message);
                }
            }

            // If dashboard is NOT live/opened, send notification email to configured emails
            if (!isDashboardLive) {
                const emails = chatbot.notificationEmails;

                if (emails && emails.length > 0) {
                    console.log(`[OFFLINE-EMAIL] Dashboard is not active. Sending email notification to: ${emails.join(', ')}`);
                    const subject = `[Live Support] New message from ${visitorId || 'Visitor'} on ${chatbot.name}`;
                    const html = `
                        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
                            <h2 style="color: #2563eb;">New Live Chat Message</h2>
                            <p>You received a live chat message on <strong>${chatbot.name}</strong> from <strong>${visitorId || 'Visitor'}</strong> while your dashboard was closed.</p>
                            <blockquote style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; font-size: 15px; color: #1e293b;">
                                ${message}
                            </blockquote>
                            <p style="color: #64748b; font-size: 13px;">
                                Log in to your dashboard to view and reply to the visitor in real-time.
                            </p>
                            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/conversations/${chatbotId}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                                Open Conversation
                            </a>
                        </div>
                    `;

                    await sendEmail(emails, subject, html);
                }
            } else {
                console.log(`[LIVE-CHAT] Dashboard is active/open for owner ${chatbot.userId}. Skipping offline email notification.`);
            }
        } catch (emailError) {
            console.error('Failed to send notification email:', emailError);
            // Don't fail the request
        }

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
