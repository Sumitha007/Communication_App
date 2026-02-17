import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

import { db } from '@/firebase';

/* ================= TYPES ================= */

export interface Participant {
  uid: string;
  name: string;
  joinedAt: Date; // IMPORTANT: Date instead of serverTimestamp
}

export interface Meeting {
  id: string;
  createdBy: string;
  createdAt: Timestamp;
  participants: Participant[];
  isActive: boolean;
}

/* ================= CREATE MEETING ================= */

export const createMeeting = async (
  meetingId: string,
  userId: string,
  userName: string
): Promise<boolean> => {
  try {
    const meetingRef = doc(db, 'meetings', meetingId);

    const newMeeting = {
      createdBy: userId,
      createdAt: serverTimestamp(),
      participants: [
        {
          uid: userId,
          name: userName,
          joinedAt: new Date() // 🔥 FIXED HERE
        }
      ],
      isActive: true
    };

    await setDoc(meetingRef, newMeeting);
    console.log('Meeting created:', meetingId);

    return true;
  } catch (error) {
    console.error('Error creating meeting:', error);
    return false;
  }
};

/* ================= CHECK EXISTS ================= */

export const meetingExists = async (meetingId: string): Promise<boolean> => {
  try {
    const meetingRef = doc(db, 'meetings', meetingId);
    const meetingDoc = await getDoc(meetingRef);

    return meetingDoc.exists() && meetingDoc.data()?.isActive === true;
  } catch (error) {
    console.error('Error checking meeting existence:', error);
    return false;
  }
};

/* ================= JOIN MEETING ================= */

export const joinMeeting = async (
  meetingId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const meetingRef = doc(db, 'meetings', meetingId);
    const meetingDoc = await getDoc(meetingRef);

    if (!meetingDoc.exists()) {
      return { success: false, error: 'Meeting not found' };
    }

    const meetingData = meetingDoc.data() as Meeting;

    if (!meetingData.isActive) {
      return { success: false, error: 'Meeting has ended' };
    }

    // prevent duplicate join
    const isAlreadyParticipant = meetingData.participants?.some(
      (p: Participant) => p.uid === userId
    );

    if (isAlreadyParticipant) {
      return { success: true };
    }

    const newParticipant: Participant = {
      uid: userId,
      name: userName,
      joinedAt: new Date() // 🔥 FIXED HERE
    };

    await updateDoc(meetingRef, {
      participants: arrayUnion(newParticipant)
    });

    console.log('Successfully joined meeting:', meetingId);

    return { success: true };
  } catch (error) {
    console.error('Error joining meeting:', error);
    return { success: false, error: 'Failed to join meeting' };
  }
};

/* ================= LEAVE MEETING ================= */

export const leaveMeeting = async (
  meetingId: string,
  userId: string
): Promise<boolean> => {
  try {
    const meetingRef = doc(db, 'meetings', meetingId);
    const meetingDoc = await getDoc(meetingRef);

    if (!meetingDoc.exists()) return false;

    const meetingData = meetingDoc.data() as Meeting;

    const participantToRemove = meetingData.participants.find(
      (p: Participant) => p.uid === userId
    );

    if (participantToRemove) {
      await updateDoc(meetingRef, {
        participants: arrayRemove(participantToRemove)
      });
    }

    console.log('Successfully left meeting:', meetingId);
    return true;
  } catch (error) {
    console.error('Error leaving meeting:', error);
    return false;
  }
};

/* ================= GET MEETING ================= */

export const getMeeting = async (meetingId: string): Promise<Meeting | null> => {
  try {
    const meetingRef = doc(db, 'meetings', meetingId);
    const meetingDoc = await getDoc(meetingRef);

    if (!meetingDoc.exists()) return null;

    return {
      id: meetingDoc.id,
      ...meetingDoc.data()
    } as Meeting;
  } catch (error) {
    console.error('Error getting meeting:', error);
    return null;
  }
};

/* ================= REALTIME SUBSCRIBE ================= */

export const subscribeMeeting = (
  meetingId: string,
  onUpdate: (meeting: Meeting | null) => void
): (() => void) => {
  const meetingRef = doc(db, 'meetings', meetingId);

  const unsubscribe = onSnapshot(
    meetingRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
        return;
      }

      const meeting = {
        id: snapshot.id,
        ...snapshot.data()
      } as Meeting;

      onUpdate(meeting);
    },
    (error) => {
      console.error('Error listening to meeting:', error);
      onUpdate(null);
    }
  );

  return unsubscribe;
};

/* ================= END MEETING ================= */

export const endMeeting = async (meetingId: string): Promise<boolean> => {
  try {
    const meetingRef = doc(db, 'meetings', meetingId);

    await updateDoc(meetingRef, {
      isActive: false
    });

    return true;
  } catch (error) {
    console.error('Error ending meeting:', error);
    return false;
  }
};
