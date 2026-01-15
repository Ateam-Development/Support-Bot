const { NextResponse } = require('next/server');
const { verifyAuth } = require('@/lib/auth-middleware');
const { getAuth } = require('@/lib/firebase-admin');

/**
 * GET /api/auth/user
 * Get authenticated user information
 */
export async function GET(request) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (authResult.error) {
            return authResult.error;
        }

        const { user } = authResult;

        // Get additional user data from Firebase Auth
        const userRecord = await getAuth().getUser(user.uid);

        return NextResponse.json({
            success: true,
            data: {
                uid: userRecord.uid,
                email: userRecord.email,
                emailVerified: userRecord.emailVerified,
                displayName: userRecord.displayName,
                photoURL: userRecord.photoURL,
                disabled: userRecord.disabled,
                metadata: {
                    creationTime: userRecord.metadata.creationTime,
                    lastSignInTime: userRecord.metadata.lastSignInTime
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error.message);

        return NextResponse.json(
            {
                success: false,
                error: 'InternalError',
                message: 'Error fetching user information'
            },
            { status: 500 }
        );
    }
}
