import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { verifyChatbotOwnership, handleApiError } from '@/lib/api-utils';
import { updateLead } from '@/lib/leads';

/**
 * PATCH /api/leads/:chatbotId/:leadId
 * Update lead status / notes
 */
export async function PATCH(request, { params }) {
    try {
        const authResult = await verifyAuth(request);
        if (authResult.error) return authResult.error;

        const { chatbotId, leadId } = await params;
        const ownershipResult = await verifyChatbotOwnership(chatbotId, authResult.user.uid);
        if (ownershipResult.error) return ownershipResult.error;

        const lead = await updateLead(leadId, chatbotId, await request.json());
        if (!lead) {
            return NextResponse.json({ success: false, error: 'NotFound', message: 'Lead not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: lead });
    } catch (error) {
        return handleApiError(error, 'updating lead');
    }
}
