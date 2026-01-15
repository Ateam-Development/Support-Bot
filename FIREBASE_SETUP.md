# Firebase Environment Variables Setup

## Required Environment Variables

Add these to your `.env.local` file:

### Firebase Client SDK (for browser authentication)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### Firebase Admin SDK (for server-side - already configured)
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com
```

## How to Get These Values

### Option 1: Firebase Console (Web App Config)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll down to **Your apps** section
5. If you don't have a web app yet:
   - Click **Add app** → Select **Web** (</> icon)
   - Register your app with a nickname
6. You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

7. Copy these values to your `.env.local` with the `NEXT_PUBLIC_` prefix

### Option 2: Service Account (Admin SDK)

1. Go to Firebase Console → Project Settings → **Service Accounts**
2. Click **Generate New Private Key**
3. Download the JSON file
4. Extract the values from the JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and \n characters)
   - `private_key_id` → `FIREBASE_PRIVATE_KEY_ID`
   - `client_id` → `FIREBASE_CLIENT_ID`
   - `client_x509_cert_url` → `FIREBASE_CERT_URL`

## Important Notes

> [!IMPORTANT]
> - **Never commit `.env.local`** to version control (it's already in `.gitignore`)
> - The `NEXT_PUBLIC_` prefix makes variables available in the browser
> - Admin SDK variables (without `NEXT_PUBLIC_`) are only available server-side
> - For Firestore, you **do not need** `FIREBASE_DATABASE_URL`

## After Adding Variables

1. **Restart your dev server** for changes to take effect:
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

2. **Test the setup**:
   - Navigate to `http://localhost:3000/login`
   - Try signing up with email/password
   - Check browser console for any errors

## Troubleshooting

### "No authenticated user found" warning
- This is normal when not logged in
- Sign in at `/login` first

### "Firebase: Error (auth/...)"
- Check that all environment variables are set correctly
- Verify Firebase Authentication is enabled in Firebase Console
- For Google Sign-In, enable it in Firebase Console → Authentication → Sign-in method

### Still getting 401 errors
- Make sure you're logged in
- Check browser DevTools → Application → Storage to see if Firebase auth state exists
- Verify the Authorization header is being sent in Network tab
