import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { verifyChatbotOwnership, handleApiError } from '@/lib/api-utils';
import { getBookingsByChatbotId } from '@/lib/bookings';

/**
 * GET /api/bookings/:chatbotId
 * All appointments for a chatbot, ordered by start time
 */
export async function GET(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { chatbotId } = await params;
        const ownershipResult = await verifyChatbotOwnership(chatbotId, authResult.user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        const bookings = await getBookingsByChatbotId(chatbotId);
        return NextResponse.json({ success: true, data: bookings });
    } catch (error) {
        return handleApiError(error, 'fetching bookings');
    }
}
