import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  MonitorUp, 
  PhoneOff,
  MessageSquare,
  X,
  Send,
  Users,
  Copy,
  Check,
  AlertCircle,
  Smile,
  Hand,
  Heart,
  ThumbsUp,
  Monitor
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  joinMeeting, 
  leaveMeeting, 
  subscribeMeeting, 
  type Meeting, 
  type Participant 
} from '@/services/meetingService';
import {
  startLocalStream,
  createCall,
  joinCall,
  toggleAudio,
  toggleVideo,
  hangUp,
  startScreenShare,
  stopScreenShare
} from '@/services/webrtcService';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  time: string;
}

interface EmojiReaction {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
  timestamp: number;
}

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Video refs for WebRTC
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<EmojiReaction[]>([]);
  
  // Meeting state
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isJoining, setIsJoining] = useState(true);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Join meeting and setup real-time listener
  useEffect(() => {
    if (!roomId || !user) {
      navigate('/dashboard');
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let hasJoined = false;

    const initializeMeeting = async () => {
      setIsJoining(true);
      setJoinError(null);

      try {
        // Join the meeting
        const result = await joinMeeting(roomId, user.id, user.name);

        if (!result.success) {
          setJoinError(result.error || 'Failed to join meeting');
          setIsJoining(false);
          
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.error || 'Failed to join meeting',
          });
          
          // Redirect back to dashboard after 3 seconds
          setTimeout(() => navigate('/dashboard'), 3000);
          return;
        }

        hasJoined = true;

        // Setup real-time listener for meeting updates
        unsubscribe = subscribeMeeting(roomId, (updatedMeeting) => {
          if (updatedMeeting) {
            setMeeting(updatedMeeting);
            setParticipants(updatedMeeting.participants);
          } else {
            setJoinError('Meeting ended or not found');
            setTimeout(() => navigate('/dashboard'), 2000);
          }
        });

        setIsJoining(false);
      } catch (error) {
        console.error('Error initializing meeting:', error);
        setJoinError('An unexpected error occurred');
        setIsJoining(false);
      }
    };

    initializeMeeting();

    // Cleanup: leave meeting when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (hasJoined && roomId && user) {
        leaveMeeting(roomId, user.id);
      }
    };
  }, [roomId, user, navigate, toast]);

  // WebRTC initialization
  useEffect(() => {
    if (!roomId) {
      console.log('No roomId, skipping WebRTC init');
      return;
    }

    // Wait for refs to be ready
    if (!localVideoRef.current || !remoteVideoRef.current) {
      console.log('Video refs not ready yet');
      return;
    }

    console.log('🚀 Starting WebRTC initialization...');

    const initWebRTC = async () => {
      try {
        // Start camera
        await startLocalStream(localVideoRef.current!);

        // Small delay to ensure stream is ready
        await new Promise(resolve => setTimeout(resolve, 300));

        // Try joining existing call first
        try {
          console.log('🔗 Attempting to join existing call...');
          await joinCall(roomId, remoteVideoRef.current!);
          console.log('✅ Joined existing call');
        } catch (error: any) {
          // If no call exists -> create one (host)
          console.log('🆕 No existing call, creating new one...');
          try {
            await createCall(roomId, remoteVideoRef.current!);
            console.log('✅ Call created successfully');
          } catch (createErr: any) {
            console.error('❌ Failed to create call:', createErr);
            // Don't throw - camera still works without signaling
            if (createErr.message?.includes('Firestore permission')) {
              toast({
                variant: 'destructive',
                title: 'Firestore Permission Error',
                description: 'Please update Firestore security rules to allow calls collection.',
                duration: 10000,
              });
            }
          }
        }

      } catch (err: any) {
        console.error('❌ WebRTC initialization error:', err);
        
        toast({
          variant: 'destructive',
          title: 'Camera Error',
          description: err.message || 'Failed to access camera. Please check permissions.',
          duration: 7000,
        });
      }
    };

    // Delay WebRTC init slightly to ensure meeting is joined first
    const timer = setTimeout(initWebRTC, 1000);
    return () => {
      clearTimeout(timer);
      console.log('🧹 Cleaning up WebRTC...');
      hangUp(); // Stop camera and cleanup
    };
  }, [roomId, toast]);

  const handleLeaveCall = async () => {
    hangUp(); // Stop camera
    if (roomId && user) {
      await leaveMeeting(roomId, user.id);
    }
    navigate('/dashboard');
  };

  // Handle audio toggle
  const handleToggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    toggleAudio(!newMutedState); // Enable audio when not muted
  };

  // Handle video toggle
  const handleToggleVideo = () => {
    const newVideoState = !isVideoOff;
    setIsVideoOff(newVideoState);
    toggleVideo(!newVideoState); // Enable video when not off
  };

  // Handle screen share
  const handleScreenShare = async () => {
    if (!localVideoRef.current) return;

    try {
      if (!isScreenSharing) {
        await startScreenShare(localVideoRef.current);
        setIsScreenSharing(true);
        toast({
          title: 'Screen Sharing',
          description: 'You are now sharing your screen',
        });
      } else {
        stopScreenShare(localVideoRef.current);
        setIsScreenSharing(false);
        toast({
          title: 'Screen Sharing Stopped',
          description: 'You stopped sharing your screen',
        });
      }
    } catch (error) {
      console.error('Screen share error:', error);
      toast({
        variant: 'destructive',
        title: 'Screen Share Error',
        description: 'Failed to share screen. Please try again.',
      });
    }
  };

  // Handle emoji reaction
  const handleEmojiReaction = (emoji: string) => {
    if (!user) return;

    const reaction: EmojiReaction = {
      id: Date.now().toString(),
      emoji,
      userId: user.id,
      userName: user.name,
      timestamp: Date.now()
    };

    setReactions(prev => [...prev, reaction]);
    setShowEmojiPicker(false);

    // Remove reaction after 3 seconds
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      setMessages([...messages, {
        id: Date.now().toString(),
        sender: 'You',
        message: chatMessage,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      }]);
      setChatMessage('');
    }
  };

  // Show loading state while joining
  if (isJoining) {
    return (
      <div className="h-screen bg-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-primary-foreground text-lg">Joining meeting...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (joinError) {
    return (
      <div className="h-screen bg-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="text-base ml-2">
              {joinError}
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="w-full mt-4 bg-primary-foreground"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-foreground flex">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 bg-background/5 backdrop-blur-sm flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
              <VideoIcon className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-medium text-primary-foreground">Meeting Room</h1>
              <p className="text-xs text-primary-foreground/60">{roomId}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
            <Button
              variant={isParticipantsOpen ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Users className="w-4 h-4 mr-2" />
              {participants.length}
            </Button>
          </div>
        </header>

        {/* Video Grid */}
        <div className="flex-1 p-4 flex gap-4 relative">
          {/* Main Video (Remote) */}
          <div className="flex-1 relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover rounded-xl"
              style={{ backgroundColor: '#1a1a1a' }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-24 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                <Users className="w-12 h-12 text-primary-foreground/50" />
              </div>
            </div>

            {/* Floating Emoji Reactions */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {reactions.map((reaction) => (
                <div
                  key={reaction.id}
                  className="absolute animate-float-up"
                  style={{
                    left: `${Math.random() * 80 + 10}%`,
                    bottom: '10%',
                    fontSize: '3rem',
                    animation: 'floatUp 3s ease-out forwards'
                  }}
                >
                  {reaction.emoji}
                </div>
              ))}
            </div>
            
            {/* Self Video (Picture-in-Picture) */}
            <div className="absolute bottom-4 right-4 w-48 h-36 rounded-xl overflow-hidden bg-gray-800 border-2 border-white/10 shadow-2xl">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                style={{ backgroundColor: '#1a1a1a', transform: 'scaleX(-1)' }}
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/40 flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl font-semibold text-white">
                        {user?.name?.charAt(0).toUpperCase() || 'Y'}
                      </span>
                    </div>
                    <p className="text-xs text-white/70">Camera off</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 text-xs text-white font-medium bg-black/70 px-2 py-1 rounded">
                You {isMuted && '🔇'}
              </div>
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="h-20 flex items-center justify-center gap-3 bg-gray-900/95 backdrop-blur-lg shadow-2xl border-t border-gray-800 relative z-50">
          {/* Emoji Picker Popup */}
          {showEmojiPicker && (
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-card border border-border rounded-2xl shadow-2xl p-4 animate-fade-in">
              <div className="flex gap-3">
                <button
                  onClick={() => handleEmojiReaction('👍')}
                  className="text-4xl hover:scale-125 transition-transform cursor-pointer"
                  title="Thumbs up"
                >
                  👍
                </button>
                <button
                  onClick={() => handleEmojiReaction('❤️')}
                  className="text-4xl hover:scale-125 transition-transform cursor-pointer"
                  title="Heart"
                >
                  ❤️
                </button>
                <button
                  onClick={() => handleEmojiReaction('😂')}
                  className="text-4xl hover:scale-125 transition-transform cursor-pointer"
                  title="Laugh"
                >
                  😂
                </button>
                <button
                  onClick={() => handleEmojiReaction('👏')}
                  className="text-4xl hover:scale-125 transition-transform cursor-pointer"
                  title="Clap"
                >
                  👏
                </button>
                <button
                  onClick={() => handleEmojiReaction('🎉')}
                  className="text-4xl hover:scale-125 transition-transform cursor-pointer"
                  title="Celebrate"
                >
                  🎉
                </button>
                <button
                  onClick={() => handleEmojiReaction('🤔')}
                  className="text-4xl hover:scale-125 transition-transform cursor-pointer"
                  title="Thinking"
                >
                  🤔
                </button>
              </div>
            </div>
          )}

          <Button
            variant={isMuted ? 'controlDanger' : 'control'}
            size="iconXl"
            onClick={handleToggleMute}
            className="rounded-full"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            variant={isVideoOff ? 'controlDanger' : 'control'}
            size="iconXl"
            onClick={handleToggleVideo}
            className="rounded-full"
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
          </Button>

          <Button
            variant={isScreenSharing ? 'controlActive' : 'control'}
            size="iconXl"
            onClick={handleScreenShare}
            className="rounded-full"
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? <Monitor className="w-6 h-6" /> : <MonitorUp className="w-6 h-6" />}
          </Button>

          <Button
            variant={showEmojiPicker ? 'controlActive' : 'control'}
            size="iconXl"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="rounded-full"
            title="Send reaction"
          >
            <Smile className="w-6 h-6" />
          </Button>

          <Button
            variant={isChatOpen ? 'controlActive' : 'control'}
            size="iconXl"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="rounded-full"
            title="Toggle chat"
          >
            <MessageSquare className="w-6 h-6" />
          </Button>

          <div className="w-px h-10 bg-primary-foreground/20 mx-2" />

          <Button
            variant="controlDanger"
            size="iconXl"
            onClick={handleLeaveCall}
            className="rounded-full"
            title="Leave call"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Chat Sidebar */}
      {isChatOpen && (
        <div className="w-80 bg-card border-l border-border flex flex-col animate-fade-in">
          <div className="h-14 flex items-center justify-between px-4 border-b border-border">
            <h2 className="font-semibold text-foreground">In-call messages</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Start a conversation</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-foreground text-sm">{msg.sender}</span>
                      <span className="text-xs text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{msg.message}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                placeholder="Send a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!chatMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Participants Sidebar */}
      {isParticipantsOpen && (
        <div className="w-80 bg-card border-l border-border flex flex-col animate-fade-in">
          <div className="h-14 flex items-center justify-between px-4 border-b border-border">
            <h2 className="font-semibold text-foreground">
              Participants ({participants.length})
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setIsParticipantsOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {participants.map((participant) => {
                const isCurrentUser = participant.uid === user?.id;
                const joinedTime = participant.joinedAt instanceof Date 
                  ? participant.joinedAt 
                  : (participant.joinedAt as any)?.toDate?.() || new Date();
                
                return (
                  <div 
                    key={participant.uid} 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary-foreground">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {participant.name} {isCurrentUser && '(You)'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {joinedTime.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    {meeting?.createdBy === participant.uid && (
                      <div className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium">
                        Host
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default Room;
