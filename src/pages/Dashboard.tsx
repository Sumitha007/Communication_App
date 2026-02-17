import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Video, Plus, Keyboard, LogOut, User, ChevronDown, Clock, Calendar, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createMeeting, meetingExists } from '@/services/meetingService';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [meetingCode, setMeetingCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleNewMeeting = async () => {
    if (!user) return;
    
    setIsCreating(true);
    try {
      // Generate a random meeting ID
      const roomId = Math.random().toString(36).substring(2, 12);
      
      // Create meeting document in Firestore
      const success = await createMeeting(roomId, user.id, user.name);
      
      if (success) {
        navigate(`/room/${roomId}`);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to create meeting. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (!meetingCode.trim()) return;
    
    setIsJoining(true);
    setJoinError('');
    
    try {
      const exists = await meetingExists(meetingCode.trim());
      
      if (exists) {
        navigate(`/room/${meetingCode.trim()}`);
      } else {
        setJoinError('Meeting not found. Please check the code and try again.');
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
      setJoinError('An error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
              <Video className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">ConnectMeet</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="hidden sm:block font-medium">{user?.name || 'User'}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Premium video meetings. Now free for everyone.
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              ConnectMeet provides secure, easy-to-use video conferencing for your team.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* New Meeting Card */}
            <div className="bg-card rounded-2xl border border-border p-8 shadow-soft animate-slide-up">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-6">
                  <Plus className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Start a new meeting</h2>
                <p className="text-muted-foreground mb-6">
                  Create a new video conference and invite others to join
                </p>
                <Button 
                  variant="hero" 
                  size="lg" 
                  onClick={handleNewMeeting} 
                  disabled={isCreating}
                  className="w-full"
                >
                  <Video className="w-5 h-5" />
                  {isCreating ? 'Creating...' : 'New Meeting'}
                </Button>
              </div>
            </div>

            {/* Join Meeting Card */}
            <div className="bg-card rounded-2xl border border-border p-8 shadow-soft animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6">
                  <Keyboard className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Join with a code</h2>
                <p className="text-muted-foreground mb-6">
                  Enter a meeting code to join an existing meeting
                </p>
                {joinError && (
                  <Alert variant="destructive" className="mb-4 text-left">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{joinError}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter meeting code"
                    value={meetingCode}
                    onChange={(e) => {
                      setMeetingCode(e.target.value);
                      setJoinError(''); // Clear error on input
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinMeeting()}
                    className="flex-1"
                    disabled={isJoining}
                  />
                  <Button 
                    variant="default" 
                    onClick={handleJoinMeeting}
                    disabled={!meetingCode.trim() || isJoining}
                  >
                    {isJoining ? 'Joining...' : 'Join'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Meetings (Placeholder) */}
          <div className="mt-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Recent Meetings
            </h3>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="divide-y divide-border">
                {[
                  { name: 'Team Standup', time: 'Today at 10:00 AM', participants: 5 },
                  { name: 'Product Review', time: 'Yesterday at 2:00 PM', participants: 8 },
                  { name: 'Client Meeting', time: 'Jan 28 at 11:30 AM', participants: 3 },
                ].map((meeting, index) => (
                  <div key={index} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{meeting.name}</p>
                        <p className="text-sm text-muted-foreground">{meeting.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      {meeting.participants} participants
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
