import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { verifyChatbotOwnership, handleApiError } from '@/lib/api-utils';
import { updateBookingStatus } from '@/lib/bookings';

/**
 * PATCH /api/bookings/:chatbotId/:bookingId
 * Body: { status: 'confirmed' | 'cancelled' | 'completed' }
 */
export async function PATCH(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { chatbotId, bookingId } = await params;
        const ownershipResult = await verifyChatbotOwnership(chatbotId, authResult.user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        const { status } = await request.json();
        const booking = await updateBookingStatus(bookingId, chatbotId, status);
        if (!booking) {
            return NextResponse.json({ success: false, error: 'NotFound', message: 'Booking not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: booking });
    } catch (error) {
        return handleApiError(error, 'updating booking');
    }
}
