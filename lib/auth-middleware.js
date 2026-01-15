import { getAuth } from './firebase-admin';
import { NextResponse } from 'next/server';

/**
 * Verify Firebase ID token from request headers
 * Returns user data if valid, or error response if invalid
 */
async function verifyAuth(request) {
    try {
        const authHeader = request.headers.get('authorization');
        console.log('Auth Middleware: Checking Authorization header...');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('Auth Middleware: Missing or invalid Authorization header:', authHeader);
            return {
                error: NextResponse.json(
                    {
                        success: false,
                        error: 'Unauthorized',
                        message: 'No token provided. Please provide a valid Bearer token in Authorization header.'
                    },
                    { status: 401 }
                )
            };
        }

        const token = authHeader.split('Bearer ')[1];
        console.log('Auth Middleware: Token found (length: ' + token.length + ')');

        if (!token) {
            return {
                error: NextResponse.json(
                    {
                        success: false,
                        error: 'Unauthorized',
                        message: 'Invalid token format'
                    },
                    { status: 401 }
                )
            };
        }

        // Verify token with Firebase
        const decodedToken = await getAuth().verifyIdToken(token);

        // Return user info
        return {
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                emailVerified: decodedToken.email_verified,
                name: decodedToken.name,
                picture: decodedToken.picture,
                firebase: decodedToken
            }
        };
    } catch (error) {
        console.error('Token verification error:', error.message);

        // Handle specific Firebase Auth errors
        if (error.code === 'auth/id-token-expired') {
            return {
                error: NextResponse.json(
                    {
                        success: false,
                        error: 'TokenExpired',
                        message: 'Your session has expired. Please sign in again.'
                    },
                    { status: 401 }
                )
            };
        }

        if (error.code === 'auth/id-token-revoked') {
            return {
                error: NextResponse.json(
                    {
                        success: false,
                        error: 'TokenRevoked',
                        message: 'Your session has been revoked. Please sign in again.'
                    },
                    { status: 401 }
                )
            };
        }

        return {
            error: NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized',
                    message: 'Invalid or expired token'
                },
                { status: 401 }
            )
        };
    }
}

/**
 * Optional authentication - verifies token if present, but doesn't require it
 * Returns user data if token is valid, or null if no token/invalid token
 */
async function optionalAuth(request) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { user: null };
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(token);

        return {
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                emailVerified: decodedToken.email_verified,
                name: decodedToken.name,
                picture: decodedToken.picture,
                firebase: decodedToken
            }
        };
    } catch (error) {
        // Silently fail for optional auth
        console.log('Optional auth - token verification failed:', error.message);
        return { user: null };
    }
}

export {
    verifyAuth,
    optionalAuth
};
