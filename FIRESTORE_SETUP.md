# Firestore Security Rules Setup

## Problem
You're seeing the error: **"Missing or insufficient permissions"**

This happens because Firestore security rules are blocking write access to the `calls` collection needed for WebRTC signaling.

## Solution

### Step 1: Open Firebase Console
1. Go to https://console.firebase.google.com/
2. Select your project: **connectmeet-92dac**

### Step 2: Navigate to Firestore Rules
1. Click **Firestore Database** in the left sidebar
2. Click the **Rules** tab at the top

### Step 3: Update Security Rules
Replace your current rules with this:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow authenticated users to read/write meetings
    match /meetings/{meetingId} {
      allow read, write: if request.auth != null;
    }
    
    // Allow authenticated users to read/write calls (for WebRTC)
    match /calls/{callId} {
      allow read, write: if request.auth != null;
      
      // Allow sub-collections for ICE candidates
      match /offerCandidates/{document=**} {
        allow read, write: if request.auth != null;
      }
      
      match /answerCandidates/{document=**} {
        allow read, write: if request.auth != null;
      }
    }
    
    // Users collection (if you have one)
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

### Step 4: Publish Rules
1. Click the **Publish** button
2. Wait for confirmation "Rules published successfully"

### Step 5: Test
1. Refresh your browser on http://localhost:8082/
2. Create or join a meeting
3. Allow camera/microphone when prompted
4. Your camera should now work!

## What These Rules Do

- **meetings collection**: Allows authenticated users to create/join meetings
- **calls collection**: Allows WebRTC signaling data (offers, answers, ICE candidates)
- **offerCandidates & answerCandidates**: Sub-collections for peer-to-peer connection setup

## Security Note
These rules allow any authenticated user to read/write. For production, you should add more specific rules:

```javascript
// Example: Only meeting participants can access that meeting's call data
match /calls/{callId} {
  allow read, write: if request.auth != null && 
    exists(/databases/$(database)/documents/meetings/$(callId)/participants/$(request.auth.uid));
}
```

## Troubleshooting

**Error persists after updating rules?**
- Wait 1-2 minutes for rules to propagate
- Clear browser cache and refresh
- Check browser console for specific error messages

**Still getting permission errors?**
- Make sure you're logged in (authenticated)
- Verify the rules were published (no red X next to Rules tab)
- Check that your Firebase project ID matches in firebase.js

**Camera permission vs Firestore permission:**
- **Camera Error**: Browser needs permission to access your camera
- **Firestore Error**: Firebase needs rules to allow data writes
- Both need to be granted for video calling to work
