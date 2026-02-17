# Join Meeting System Documentation

## Overview

The Join Meeting System enables users to create meetings, join existing meetings, and track participants in real-time using Firebase Firestore and WebRTC (coming soon).

---

## Firestore Structure

### Collection: `meetings`

Each meeting is stored as a document with the following structure:

```javascript
{
  "id": "abc123xyz",                    // Meeting ID (document ID)
  "createdBy": "user-uid-123",          // UID of meeting creator
  "createdAt": Timestamp,               // Server timestamp
  "isActive": true,                     // Meeting status
  "participants": [                     // Array of participants
    {
      "uid": "user-uid-123",
      "name": "John Doe",
      "joinedAt": Timestamp
    },
    {
      "uid": "user-uid-456",
      "name": "Jane Smith",
      "joinedAt": Timestamp
    }
  ]
}
```

### Example Document

```json
{
  "id": "k8j2h5m9p1",
  "createdBy": "abc123def456",
  "createdAt": {
    "_seconds": 1708041600,
    "_nanoseconds": 0
  },
  "isActive": true,
  "participants": [
    {
      "uid": "abc123def456",
      "name": "John Doe",
      "joinedAt": {
        "_seconds": 1708041600,
        "_nanoseconds": 0
      }
    },
    {
      "uid": "xyz789uvw012",
      "name": "Jane Smith",
      "joinedAt": {
        "_seconds": 1708041720,
        "_nanoseconds": 0
      }
    }
  ]
}
```

---

## Architecture

### Service Layer: `meetingService.ts`

Located at: `src/services/meetingService.ts`

#### Core Functions

##### 1. **createMeeting**
Creates a new meeting document in Firestore.

```typescript
createMeeting(
  meetingId: string, 
  userId: string, 
  userName: string
): Promise<boolean>
```

**Usage:**
```typescript
const success = await createMeeting('k8j2h5m9p1', 'user123', 'John Doe');
```

---

##### 2. **meetingExists**
Checks if a meeting exists and is active.

```typescript
meetingExists(meetingId: string): Promise<boolean>
```

**Usage:**
```typescript
const exists = await meetingExists('k8j2h5m9p1');
if (exists) {
  // Proceed to join
}
```

---

##### 3. **joinMeeting**
Adds a user to the participants array. Prevents duplicate joining.

```typescript
joinMeeting(
  meetingId: string, 
  userId: string, 
  userName: string
): Promise<{ success: boolean; error?: string }>
```

**Usage:**
```typescript
const result = await joinMeeting('k8j2h5m9p1', 'user456', 'Jane Smith');
if (result.success) {
  console.log('Successfully joined!');
} else {
  console.error(result.error);
}
```

**Returns:**
- `{ success: true }` - Successfully joined
- `{ success: false, error: "Meeting not found" }` - Meeting doesn't exist
- `{ success: false, error: "Meeting has ended" }` - Meeting is no longer active

---

##### 4. **leaveMeeting**
Removes a participant from the meeting.

```typescript
leaveMeeting(meetingId: string, userId: string): Promise<boolean>
```

**Usage:**
```typescript
await leaveMeeting('k8j2h5m9p1', 'user456');
```

---

##### 5. **subscribeMeeting** (Real-time Listener)
Subscribes to meeting updates using Firestore's `onSnapshot`.

```typescript
subscribeMeeting(
  meetingId: string,
  onUpdate: (meeting: Meeting | null) => void
): () => void
```

**Usage:**
```typescript
const unsubscribe = subscribeMeeting('k8j2h5m9p1', (meeting) => {
  if (meeting) {
    console.log('Participants:', meeting.participants);
  }
});

// Cleanup
unsubscribe();
```

---

## Component Integration

### Dashboard Component

**File:** `src/pages/Dashboard.tsx`

#### Creating a Meeting

```typescript
const handleNewMeeting = async () => {
  const roomId = Math.random().toString(36).substring(2, 12);
  const success = await createMeeting(roomId, user.id, user.name);
  
  if (success) {
    navigate(`/room/${roomId}`);
  }
};
```

#### Joining a Meeting

```typescript
const handleJoinMeeting = async () => {
  const exists = await meetingExists(meetingCode.trim());
  
  if (exists) {
    navigate(`/room/${meetingCode.trim()}`);
  } else {
    setJoinError('Meeting not found');
  }
};
```

---

### Room Component

**File:** `src/pages/Room.tsx`

#### Real-time Participant Tracking

```typescript
useEffect(() => {
  // Join meeting
  const result = await joinMeeting(roomId, user.id, user.name);
  
  if (!result.success) {
    setJoinError(result.error);
    return;
  }
  
  // Subscribe to updates
  const unsubscribe = subscribeMeeting(roomId, (meeting) => {
    if (meeting) {
      setParticipants(meeting.participants);
    }
  });
  
  // Cleanup on unmount
  return () => {
    unsubscribe();
    leaveMeeting(roomId, user.id);
  };
}, [roomId, user]);
```

---

## Features Implemented

### ✅ User Can Enter Meeting ID and Join
- Input field on Dashboard
- Validation before navigation
- Error display if meeting doesn't exist

### ✅ Meeting Validation
- Checks if meeting exists in Firestore
- Verifies meeting is active (`isActive: true`)

### ✅ Add User to Participants
- User UID, name, and timestamp stored
- Prevents duplicate joins

### ✅ Real-time Participant List
- Uses Firestore `onSnapshot` listener
- Updates UI automatically when users join/leave

### ✅ Participant UI Display
- Shows participant count in header
- Collapsible sidebar with full participant list
- Displays join time for each participant
- Highlights meeting host

### ✅ Error Handling
- "Meeting not found" error
- "Meeting has ended" error
- Loading states during join process

### ✅ Auto Remove on Leave
- Participant removed when closing tab/window
- Participant removed when clicking "Leave Call"
- Cleanup in `useEffect` return function

---

## User Flow

### Creating a Meeting

1. User clicks **"New Meeting"** on Dashboard
2. System generates random 10-character meeting ID
3. Meeting document created in Firestore with creator as first participant
4. User navigated to `/room/{meetingId}`
5. Room page joins meeting and starts real-time listener

### Joining a Meeting

1. User enters meeting code on Dashboard
2. Clicks **"Join"** button
3. System validates meeting exists in Firestore
4. If valid:
   - User navigated to `/room/{meetingId}`
   - User added to participants array
   - Real-time listener updates all participants
5. If invalid:
   - Error message displayed: "Meeting not found"

### Leaving a Meeting

1. User clicks **"Leave Call"** button
2. System removes user from participants array
3. User navigated back to Dashboard
4. Other participants' UI updates automatically (real-time)

---

## Real-time Updates

The system uses Firestore's `onSnapshot` for real-time participant tracking:

```typescript
onSnapshot(meetingRef, (doc) => {
  if (doc.exists()) {
    const meeting = doc.data();
    // UI updates automatically
    setParticipants(meeting.participants);
  }
});
```

### What Triggers Updates?

- ✅ User joins meeting → `arrayUnion` adds participant
- ✅ User leaves meeting → `arrayRemove` removes participant
- ✅ All connected clients receive update instantly

---

## Security Considerations

### Firestore Rules (Recommended)

Add these rules to your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Meetings collection
    match /meetings/{meetingId} {
      // Anyone can read active meetings
      allow read: if resource.data.isActive == true;
      
      // Only authenticated users can create meetings
      allow create: if request.auth != null 
                    && request.resource.data.createdBy == request.auth.uid;
      
      // Only authenticated users can update (join/leave)
      allow update: if request.auth != null;
      
      // Only creator or participants can delete
      allow delete: if request.auth != null 
                    && (resource.data.createdBy == request.auth.uid 
                        || request.auth.uid in resource.data.participants[].uid);
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Error States

### Dashboard
- **Empty meeting code** - Join button disabled
- **Meeting not found** - Red alert box with error message
- **Network error** - Toast notification

### Room
- **Loading state** - Spinner with "Joining meeting..." message
- **Meeting not found** - Full-screen error with "Return to Dashboard" button
- **Meeting ended** - Auto-redirect to Dashboard after 2 seconds

---

## Testing Checklist

### Create Meeting
- [ ] Click "New Meeting" button
- [ ] Verify meeting document created in Firestore
- [ ] Verify navigation to `/room/{id}`
- [ ] Verify creator appears in participants

### Join Meeting
- [ ] Enter valid meeting code
- [ ] Verify user added to participants array
- [ ] Verify navigation to room page
- [ ] Enter invalid meeting code
- [ ] Verify "Meeting not found" error displayed

### Real-time Updates
- [ ] Open same meeting in two browser tabs
- [ ] Join as different users
- [ ] Verify both participants appear in participants list
- [ ] Verify join timestamps are correct
- [ ] Verify host badge displayed for creator

### Leave Meeting
- [ ] Click "Leave Call" button
- [ ] Verify navigation to Dashboard
- [ ] Verify user removed from participants array
- [ ] Close browser tab while in meeting
- [ ] Verify user removed from participants (check Firestore Console)

### Prevent Duplicates
- [ ] Join same meeting twice with same user
- [ ] Verify no duplicate entries in participants array

---

## Future Enhancements

### Coming Soon
- 📹 WebRTC video/audio streams
- 💬 Real-time chat with Firestore
- 🎥 Screen sharing
- 🔒 Meeting passwords
- ⏰ Scheduled meetings
- 📊 Meeting history and analytics
- 🎨 Custom meeting backgrounds

---

## Debugging

### Check Firestore Console
1. Go to Firebase Console → Firestore Database
2. Navigate to `meetings` collection
3. Verify document structure matches specification

### Console Logs
The service logs key events:
```
Meeting created: k8j2h5m9p1
Successfully joined meeting: k8j2h5m9p1
Successfully left meeting: k8j2h5m9p1
```

### Common Issues

**Issue:** "Meeting not found" even though I just created it
- **Solution:** Check Firestore rules allow read access

**Issue:** Participant not removed when leaving
- **Solution:** Verify `useEffect` cleanup function is firing

**Issue:** Real-time updates not working
- **Solution:** Check internet connection and Firestore rules

---

## API Reference Summary

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `createMeeting` | meetingId, userId, userName | `Promise<boolean>` | Creates new meeting |
| `meetingExists` | meetingId | `Promise<boolean>` | Checks if meeting exists |
| `joinMeeting` | meetingId, userId, userName | `Promise<{success, error?}>` | Joins existing meeting |
| `leaveMeeting` | meetingId, userId | `Promise<boolean>` | Leaves meeting |
| `subscribeMeeting` | meetingId, callback | `() => void` | Real-time listener |
| `getMeeting` | meetingId | `Promise<Meeting \| null>` | Fetches meeting data |
| `endMeeting` | meetingId | `Promise<boolean>` | Ends meeting (sets isActive=false) |

---

## Support

For issues or questions:
1. Check Firestore Console for data integrity
2. Check browser console for errors
3. Verify Firebase configuration in `firebase.js`
4. Ensure user is authenticated before joining meetings

---

**Last Updated:** February 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready (WebRTC integration pending)
