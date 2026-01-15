
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getWorkspace, updateWorkspace } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';

/**
 * GET /api/workspace
 * Get workspace details
 */
export async function GET(request) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const workspace = await getWorkspace(user.uid);

        return NextResponse.json({
            success: true,
            data: workspace
        });
    } catch (error) {
        return handleApiError(error, 'fetching workspace');
    }
}

/**
 * PUT /api/workspace
 * Update workspace details
 */
export async function PUT(request) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;
        const { name } = await request.json();

        // Validate input
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Workspace name is required' },
                { status: 400 }
            );
        }

        const workspace = await updateWorkspace(user.uid, {
            name: name.trim()
        });

        return NextResponse.json({
            success: true,
            data: workspace,
            message: 'Workspace updated successfully'
        });
    } catch (error) {
        return handleApiError(error, 'updating workspace');
    }
}
