import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc,
  addDoc
} from "firebase/firestore";
import { db } from "@/firebase";

/* ---------------- ICE CONFIG ---------------- */

const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

let pc: RTCPeerConnection;
let localStream: MediaStream;
let remoteStream: MediaStream;

/* ---------------- START CAMERA ---------------- */

export const startLocalStream = async (
  localVideoRef: HTMLVideoElement
) => {
  try {
    console.log('🎥 Requesting camera and microphone access...');
    
    // First check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Your browser does not support camera access');
    }

    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      },
    });

    console.log('✅ Permission granted, stream obtained:', localStream);
    console.log('📹 Video tracks:', localStream.getVideoTracks().length);
    console.log('🎤 Audio tracks:', localStream.getAudioTracks().length);

    localVideoRef.srcObject = localStream;
    localVideoRef.muted = true; // Mute local video to prevent feedback
    
    // Ensure video plays
    try {
      await localVideoRef.play();
      console.log('▶️ Video playback started');
    } catch (playErr) {
      console.warn('⚠️ Video autoplay prevented:', playErr);
      // Try to play with user interaction
      localVideoRef.onclick = () => localVideoRef.play();
    }
    
    return localStream;
  } catch (error: any) {
    console.error('❌ Camera access error:', error);
    
    // Provide specific error messages
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      throw new Error('Camera permission denied. Please click the camera icon in your browser\'s address bar and allow access.');
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      throw new Error('No camera found. Please connect a camera and try again.');
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      throw new Error('Camera is already in use by another application. Please close other apps using your camera.');
    } else {
      throw new Error(error.message || 'Failed to access camera');
    }
  }
};

/* ---------------- CREATE PEER ---------------- */

const createPeerConnection = (remoteVideoRef: HTMLVideoElement) => {
  pc = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();
  remoteVideoRef.srcObject = remoteStream;

  // send tracks
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // receive tracks
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };
};

/* ---------------- CREATE CALL ---------------- */

export const createCall = async (
  roomId: string,
  remoteVideoRef: HTMLVideoElement
) => {
  try {
    createPeerConnection(remoteVideoRef);

    const callDoc = doc(db, "calls", roomId);
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");

    // ICE -> Firebase
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          await addDoc(offerCandidates, event.candidate.toJSON());
        } catch (err) {
          console.warn('Failed to add ICE candidate:', err);
        }
      }
    };

    // create offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    await setDoc(callDoc, {
      offer: {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      },
    });

    // listen answer
    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription);
      }
    });

    // listen ICE answer
    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });
    
    console.log('✅ Call created successfully');
  } catch (error: any) {
    console.error('❌ Failed to create call:', error);
    if (error.code === 'permission-denied') {
      throw new Error('Firestore permission denied. Please update your Firestore security rules.');
    }
    throw error;
  }
};

/* ---------------- JOIN CALL ---------------- */

export const joinCall = async (
  roomId: string,
  remoteVideoRef: HTMLVideoElement
) => {
  try {
    const callDoc = doc(db, "calls", roomId);
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");

    const callSnapshot = await getDoc(callDoc);
    const callData = callSnapshot.data();
    
    if (!callData || !callData.offer) {
      throw new Error("No active call found");
    }

    createPeerConnection(remoteVideoRef);

    // ICE -> Firebase
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          await addDoc(answerCandidates, event.candidate.toJSON());
        } catch (err) {
          console.warn('Failed to add ICE candidate:', err);
        }
      }
    };

  // set remote offer
  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  // create answer
  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  await updateDoc(callDoc, {
    answer: {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    },
  });

    // listen ICE from host
    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });
    
    console.log('✅ Joined call successfully');
  } catch (error: any) {
    console.error('❌ Failed to join call:', error);
    if (error.code === 'permission-denied') {
      throw new Error('Firestore permission denied. Please update your Firestore security rules.');
    }
    throw error;
  }
};

/* ---------------- MEDIA CONTROLS ---------------- */

// Toggle audio (mute/unmute)
export const toggleAudio = (enabled: boolean) => {
  if (localStream) {
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }
};

// Toggle video (on/off)
export const toggleVideo = (enabled: boolean) => {
  if (localStream) {
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }
};

// Start screen sharing
export const startScreenShare = async (localVideoRef: HTMLVideoElement) => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always" as any
      },
      audio: false
    } as any);

    // Replace video track with screen track
    const screenTrack = screenStream.getVideoTracks()[0];
    
    if (pc) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(screenTrack);
      }
    }

    // Update local video to show screen
    localVideoRef.srcObject = screenStream;

    // When user stops sharing via browser UI
    screenTrack.onended = () => {
      stopScreenShare(localVideoRef);
    };

    return screenStream;
  } catch (error) {
    console.error('Error starting screen share:', error);
    throw error;
  }
};

// Stop screen sharing and return to camera
export const stopScreenShare = (localVideoRef: HTMLVideoElement) => {
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0];
    
    if (pc) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
    }

    // Restore local video to camera
    localVideoRef.srcObject = localStream;
  }
};

// Get local stream
export const getLocalStream = () => localStream;

// Check if camera is active
export const isCameraActive = () => {
  return localStream && localStream.getVideoTracks().length > 0;
};

// Stop all tracks and cleanup
export const hangUp = () => {
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  if (pc) {
    pc.close();
  }
};
