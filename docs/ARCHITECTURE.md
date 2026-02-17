# Join Meeting System - Architecture Flow

## System Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Dashboard  │────────>│ Meeting Room │<────────│  Firestore  │
│   (Create   │         │  (Real-time  │         │  Database   │
│   & Join)   │         │   Tracking)  │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                         │
      │                        │                         │
      v                        v                         v
  User Input            Join/Leave Logic          Store Participants
```

---

## User Flow Diagrams

### Creating a Meeting

```
User Action                  System Response                Firestore
───────────                  ───────────────                ─────────

Click "New Meeting"
        │
        ├──> Generate Meeting ID
        │    (e.g., "k8j2h5m9p1")
        │
        ├──> createMeeting()  ──────────────────────────> Create Document:
        │                                                   {
        │                                                     id: "k8j2h5m9p1",
        │                                                     createdBy: "user123",
        │                                                     participants: [{...}],
        │                                                     isActive: true
        │                                                   }
        │
        └──> Navigate to /room/k8j2h5m9p1
                    │
                    └──> Room mounts
                            │
                            ├──> joinMeeting() (adds participant)
                            │
                            └──> subscribeMeeting() (real-time listener)
```

### Joining an Existing Meeting

```
User Action                  System Response                Firestore
───────────                  ───────────────                ─────────

Enter Meeting Code: "abc123xyz"
        │
Click "Join"
        │
        ├──> meetingExists("abc123xyz")  ──────────────> Query Document
        │                                                 meetings/abc123xyz
        │                     <─────────────────────────
        │                          { exists: true }
        │
        ├──> Navigate to /room/abc123xyz
        │
        └──> Room mounts
                │
                ├──> joinMeeting()  ──────────────────> Update participants:
                │                                        arrayUnion({
                │                                          uid: "user456",
                │                                          name: "Jane",
                │                                          joinedAt: now
                │                                        })
                │
                └──> subscribeMeeting() ──────────────> onSnapshot listener
                         │                               (real-time updates)
                         │
                         └──> Receive updates whenever
                              participants array changes
```

### Invalid Meeting Code

```
User Action                  System Response                Result
───────────                  ───────────────                ──────

Enter Code: "invalid123"
        │
Click "Join"
        │
        ├──> meetingExists("invalid123") ────────> Query Firestore
        │                     <───────────────────
        │                       { exists: false }
        │
        └──> Display Error:
             "Meeting not found. Please check the code..."
```

---

## Real-time Participant Tracking

```
Browser Window 1              Firestore                Browser Window 2
(User: John)                  Database                 (User: Jane)
────────────                  ────────                 ────────────

[Meeting Room]                                         [Dashboard]
Participants: [John]
        │
        │                     ┌────────────┐
        │<────────────────────┤ Meeting Doc│
        │  onSnapshot         │ participants│
        │  Listening...       │  [John]    │
        │                     └────────────┘
        │                            │
        │                            │               Click "Join" with code
        │                            │               ──────────────────>
        │                            │
        │                     Update participants                │
        │                     arrayUnion(Jane)                   │
        │                     <──────────────────────────────────┘
        │                            │
        │                     ┌────────────┐
        │<────────────────────┤ Meeting Doc│──────────────────>  │
        │  Snapshot Update    │ participants│  Snapshot Update    │
        │                     │ [John,Jane] │                     │
        │                     └────────────┘                      │
        │                                                          │
        v                                                          v
Participants: [John, Jane]                          Participants: [John, Jane]
Auto-updated!                                       Auto-updated!
```

---

## Leave Meeting Flow

```
User Action                  System Response                Firestore
───────────                  ───────────────                ─────────

Click "Leave Call"
        │
        ├──> leaveMeeting() ─────────────────────────> Update participants:
        │                                               arrayRemove({
        │                                                 uid: "user456",
        │                                                 name: "Jane",
        │                                                 joinedAt: <timestamp>
        │                                               })
        │
        ├──> Unsubscribe from real-time listener
        │
        └──> Navigate to /dashboard


──OR──

Close Tab/Window
        │
        └──> useEffect cleanup runs
                    │
                    ├──> leaveMeeting() ─────────────> arrayRemove(user)
                    │
                    └──> Unsubscribe listener
```

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│                     (Routes + Auth)                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼────────┐        ┌──────▼──────┐
        │   Dashboard    │        │    Room     │
        │                │        │             │
        │ • New Meeting  │        │ • Join Mtg  │
        │ • Join Input   │        │ • Subscribe │
        │ • Validation   │        │ • Show List │
        └────────┬───────┘        └──────┬──────┘
                 │                       │
                 │                       │
                 └───────┬───────────────┘
                         │
              ┌──────────▼───────────┐
              │  meetingService.ts   │
              │                      │
              │ • createMeeting()    │
              │ • joinMeeting()      │
              │ • leaveMeeting()     │
              │ • subscribeMeeting() │
              │ • meetingExists()    │
              └──────────┬───────────┘
                         │
                         │
                  ┌──────▼──────┐
                  │  Firestore  │
                  │             │
                  │  meetings/  │
                  │    └── {id} │
                  └─────────────┘
```

---

## Data Flow Sequence

### 1. User Creates Meeting

```
┌──────┐     ┌───────────┐     ┌─────────────┐     ┌───────────┐
│ User │     │ Dashboard │     │   Service   │     │ Firestore │
└──┬───┘     └─────┬─────┘     └──────┬──────┘     └─────┬─────┘
   │               │                   │                   │
   │ Click "New"   │                   │                   │
   ├──────────────>│                   │                   │
   │               │                   │                   │
   │               │ createMeeting()   │                   │
   │               ├──────────────────>│                   │
   │               │                   │                   │
   │               │                   │  setDoc()         │
   │               │                   ├──────────────────>│
   │               │                   │                   │
   │               │                   │  Success          │
   │               │                   │<──────────────────┤
   │               │                   │                   │
   │               │  {success: true}  │                   │
   │               │<──────────────────┤                   │
   │               │                   │                   │
   │  Navigate     │                   │                   │
   │<──────────────┤                   │                   │
   │               │                   │                   │
```

### 2. Second User Joins

```
┌──────┐     ┌───────────┐     ┌─────────────┐     ┌───────────┐
│User2 │     │ Dashboard │     │   Service   │     │ Firestore │
└──┬───┘     └─────┬─────┘     └──────┬──────┘     └─────┬─────┘
   │               │                   │                   │
   │ Enter Code    │                   │                   │
   ├──────────────>│                   │                   │
   │               │                   │                   │
   │ Click "Join"  │                   │                   │
   ├──────────────>│                   │                   │
   │               │                   │                   │
   │               │ meetingExists()   │                   │
   │               ├──────────────────>│                   │
   │               │                   │                   │
   │               │                   │  getDoc()         │
   │               │                   ├──────────────────>│
   │               │                   │                   │
   │               │                   │  {exists: true}   │
   │               │                   │<──────────────────┤
   │               │                   │                   │
   │               │  true             │                   │
   │               │<──────────────────┤                   │
   │               │                   │                   │
   │  Navigate     │                   │                   │
   │<──────────────┤                   │                   │
   │               │                   │                   │
```

### 3. Room Component Lifecycle

```
┌──────┐     ┌──────────┐     ┌─────────────┐     ┌───────────┐
│ Room │     │ useEffect│     │   Service   │     │ Firestore │
└──┬───┘     └────┬─────┘     └──────┬──────┘     └─────┬─────┘
   │              │                   │                   │
   │  Mount       │                   │                   │
   ├─────────────>│                   │                   │
   │              │                   │                   │
   │              │ joinMeeting()     │                   │
   │              ├──────────────────>│                   │
   │              │                   │                   │
   │              │                   │ updateDoc()       │
   │              │                   │ arrayUnion()      │
   │              │                   ├──────────────────>│
   │              │                   │                   │
   │              │                   │ Success           │
   │              │                   │<──────────────────┤
   │              │                   │                   │
   │              │ subscribeMeeting()│                   │
   │              ├──────────────────>│                   │
   │              │                   │                   │
   │              │                   │ onSnapshot()      │
   │              │                   ├──────────────────>│
   │              │                   │                   │
   │              │                   │ Real-time Stream  │
   │              │                   │◄------------------│
   │              │                   │                   │
   │              │  callback(meeting)│                   │
   │              │<──────────────────┤                   │
   │              │                   │                   │
   │  Update UI   │                   │                   │
   │<─────────────┤                   │                   │
   │              │                   │                   │
   │  Unmount     │                   │                   │
   ├─────────────>│                   │                   │
   │              │                   │                   │
   │              │ leaveMeeting()    │                   │
   │              ├──────────────────>│                   │
   │              │                   │                   │
   │              │                   │ arrayRemove()     │
   │              │                   ├──────────────────>│
   │              │                   │                   │
   │              │ unsubscribe()     │                   │
   │              ├──────────────────>│                   │
   │              │                   │                   │
```

---

## State Management

### Dashboard State

```typescript
const [meetingCode, setMeetingCode] = useState('');
const [isCreating, setIsCreating] = useState(false);
const [isJoining, setIsJoining] = useState(false);
const [joinError, setJoinError] = useState('');
```

**Flow:**
1. User input → updates `meetingCode`
2. Validation starts → `isJoining = true`
3. Result:
   - Success → Navigate to room
   - Error → `joinError = "Meeting not found"`

### Room State

```typescript
const [meeting, setMeeting] = useState<Meeting | null>(null);
const [participants, setParticipants] = useState<Participant[]>([]);
const [isJoining, setIsJoining] = useState(true);
const [joinError, setJoinError] = useState<string | null>(null);
const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
```

**Flow:**
1. Component mounts → `isJoining = true`
2. Join meeting → Add to Firestore
3. Subscribe → Real-time updates
4. Updates received → `setParticipants(meeting.participants)`
5. User toggles sidebar → `isParticipantsOpen = !isParticipantsOpen`

---

## Firestore Operations

### Write Operations

| Function | Operation | Firestore Method |
|----------|-----------|------------------|
| Create Meeting | Add new document | `setDoc()` |
| Join Meeting | Add to array | `updateDoc()` + `arrayUnion()` |
| Leave Meeting | Remove from array | `updateDoc()` + `arrayRemove()` |
| End Meeting | Update field | `updateDoc()` + `{isActive: false}` |

### Read Operations

| Function | Purpose | Firestore Method |
|----------|---------|------------------|
| Meeting Exists | Check validity | `getDoc()` |
| Get Meeting | Fetch data | `getDoc()` |
| Subscribe Meeting | Real-time updates | `onSnapshot()` |

---

## Error Handling Strategy

```
User Input
    │
    ├─> Validate (Client-side)
    │       ├─> Empty? → Disable button
    │       └─> Valid? → Continue
    │
    ├─> Check Firestore
    │       ├─> Meeting exists? → Proceed
    │       ├─> Not found? → Show error
    │       └─> Network error? → Show error
    │
    ├─> Join Meeting
    │       ├─> Success? → Start real-time
    │       ├─> Already joined? → Continue (not error)
    │       └─> Firestore error? → Show error
    │
    └─> Subscribe
            ├─> Updates received? → Update UI
            ├─> Meeting deleted? → Redirect to dashboard
            └─> Network error? → Show connection warning
```

---

## Performance Optimizations

### 1. Real-time Listener Cleanup
```typescript
useEffect(() => {
  const unsubscribe = subscribeMeeting(...);
  return () => unsubscribe(); // Prevent memory leaks
}, []);
```

### 2. Prevent Duplicate Joins
```typescript
// Check before adding to array
if (participants.some(p => p.uid === userId)) {
  return { success: true }; // Skip adding
}
```

### 3. Optimistic UI Updates
- Show loading states immediately
- Update UI before Firestore confirms
- Show success/error after confirmation

---

## Security Flow

```
Client Request
      │
      ├──> Firestore Security Rules
      │         │
      │         ├──> Check auth.uid exists?
      │         ├──> Check isActive == true?
      │         └──> Check user permissions?
      │                   │
      │         ┌─────────┴─────────┐
      │         │                   │
      │      Allowed           Denied
      │         │                   │
      │    Allow access      Return error
      │         │
      └──> Execute Operation
```

**Rules Applied:**
- Must be authenticated to create/join
- Can only read active meetings
- Can only update meetings you're part of

---

## Next Phase: WebRTC Integration

```
Current Setup                  WebRTC Addition (Phase 2)
─────────────                  ─────────────────────────

Firestore Participants  ──>    + Video Streams
Real-time Updates       ──>    + Audio Streams
Join/Leave Logic        ──>    + Peer Connections (RTCPeerConnection)
                               + Signaling (Firestore or WebSockets)
                               + STUN/TURN Servers
                               + Media Devices (getUserMedia)
```

---

**Documentation Complete** ✅  
See `JOIN_MEETING_SYSTEM.md` for detailed API reference
