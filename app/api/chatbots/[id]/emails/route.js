import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { updateChatbot, getChatbotById } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';

/**
 * POST /api/chatbots/:id/emails
 * Update notification emails for a chatbot
 */
export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const { emails } = await request.json();

        if (!Array.isArray(emails)) {
            return NextResponse.json(
                { success: false, error: 'BadRequest', message: 'Emails must be an array' },
                { status: 400 }
            );
        }

        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;

        // Verify ownership
        const chatbot = await getChatbotById(id);
        if (!chatbot || chatbot.userId !== user.uid) {
            return NextResponse.json(
                { success: false, error: 'Forbidden', message: 'Access denied' },
                { status: 403 }
            );
        }

        // Update chatbot with new emails
        const updated = await updateChatbot(id, {
            notificationEmails: emails
        });

        return NextResponse.json({
            success: true,
            data: updated,
            message: 'Notification emails updated'
        });

    } catch (error) {
        return handleApiError(error, 'updating notification emails');
    }
}
