// Simple script to check what's in the database
const admin = require('firebase-admin');

// Initialize if not already done
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
    });
}

const db = admin.firestore();

async function checkDatabase() {
    try {
        console.log('\n=== CHECKING DATABASE ===\n');

        // Check chatbots
        const chatbotsSnapshot = await db.collection('chatbots').get();
        console.log(`Found ${chatbotsSnapshot.size} chatbots:`);
        chatbotsSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  - ID: ${doc.id}, Name: ${data.name}, Owner: ${data.userId}`);
        });

        // Check conversations
        const conversationsSnapshot = await db.collection('conversations').get();
        console.log(`\nFound ${conversationsSnapshot.size} conversations:`);
        conversationsSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  - ID: ${doc.id}`);
            console.log(`    ChatbotID: ${data.chatbotId}`);
            console.log(`    Messages: ${data.messages?.length || 0}`);
            console.log(`    Last Updated: ${data.updatedAt?.toDate?.()}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

checkDatabase();
