import admin from 'firebase-admin';

let app = null;

/**
 * Initialize Firebase Admin SDK
 * @returns {admin.app.App}
 */
function initializeFirebaseAdmin() {
    if (app) {
        return app;
    }

    try {
        // Check if already initialized
        if (admin.apps.length > 0) {
            app = admin.apps[0];
            return app;
        }
    } catch (error) {
        // Not initialized, proceed with initialization
    }

    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
        console.error('❌ Missing Firebase Admin environment variables');
        return null;
    }

    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
    };

    try {
        app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized successfully');
    } catch (error) {
        console.error('❌ Firebase Admin initialization error:', error);
        // Try to return existing app if initialization failed (race condition)
        if (admin.apps.length > 0) {
            app = admin.apps[0];
        } else {
            throw error;
        }
    }

    return app;
}

/**
 * Get Firebase Admin app instance
 * @returns {admin.app.App}
 */
function getFirebaseApp() {
    if (!app) {
        return initializeFirebaseAdmin();
    }
    return app;
}

/**
 * Get Firebase Auth instance
 * @returns {admin.auth.Auth}
 */
function getAuth() {
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) throw new Error('Firebase Admin not initialized');
    return admin.auth(firebaseApp);
}

/**
 * Get Firestore instance
 * @returns {admin.firestore.Firestore}
 */
function getFirestore() {
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) throw new Error('Firebase Admin not initialized');
    return admin.firestore(firebaseApp);
}

export {
    initializeFirebaseAdmin,
    getFirebaseApp,
    getAuth,
    getFirestore,
    admin
};
