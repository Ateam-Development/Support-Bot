const { NextResponse } = require('next/server');
const { getAuth } = require('@/lib/firebase-admin');

/**
 * POST /api/auth/verify
 * Verify a Firebase ID token
 */
export async function POST(request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'BadRequest',
                    message: 'Token is required'
                },
                { status: 400 }
            );
        }

        const decodedToken = await getAuth().verifyIdToken(token);

        return NextResponse.json({
            success: true,
            data: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                emailVerified: decodedToken.email_verified,
                name: decodedToken.name,
                picture: decodedToken.picture
            }
        });
    } catch (error) {
        console.error('Token verification error:', error.message);

        return NextResponse.json(
            {
                success: false,
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            },
            { status: 401 }
        );
    }
}
