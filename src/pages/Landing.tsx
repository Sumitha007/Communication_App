import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Video, Shield, Users, Zap, Globe, Lock } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
              <Video className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">ConnectMeet</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              <span>Now with HD Video & Screen Sharing</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6">
              Secure Real-Time
              <span className="block bg-gradient-to-r from-primary to-[hsl(200,80%,50%)] bg-clip-text text-transparent">
                Video Collaboration
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Connect with your team instantly through crystal-clear video conferencing. 
              Host meetings, share screens, and collaborate in real-time with enterprise-grade security.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/register">
                  Start Free Meeting
                </Link>
              </Button>
              <Button variant="heroOutline" size="xl" asChild>
                <Link to="/login">
                  Sign In to Dashboard
                </Link>
              </Button>
            </div>
          </div>

          {/* Hero Image Placeholder */}
          <div className="mt-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="relative mx-auto max-w-4xl">
              <div className="absolute inset-0 gradient-hero opacity-20 blur-3xl rounded-3xl" />
              <div className="relative bg-card rounded-2xl shadow-medium border border-border overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-muted to-secondary flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <Video className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-lg">Video Conference Preview</p>
                  </div>
                </div>
                {/* Mock Control Bar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-foreground/90 backdrop-blur-sm rounded-full">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-primary" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <div className="w-4 h-4 rounded bg-primary" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center">
                    <div className="w-4 h-1 rounded bg-destructive-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need for seamless meetings
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Professional video conferencing tools designed for modern teams
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Video,
                title: 'HD Video Calls',
                description: 'Crystal-clear video quality with adaptive streaming for any connection speed',
              },
              {
                icon: Shield,
                title: 'End-to-End Encryption',
                description: 'Your conversations are protected with enterprise-grade security protocols',
              },
              {
                icon: Users,
                title: 'Team Collaboration',
                description: 'Host meetings with unlimited participants and breakout rooms',
              },
              {
                icon: Globe,
                title: 'Screen Sharing',
                description: 'Share your screen, applications, or specific windows with one click',
              },
              {
                icon: Lock,
                title: 'Private Meetings',
                description: 'Password-protected rooms with waiting room controls',
              },
              {
                icon: Zap,
                title: 'Instant Join',
                description: 'No downloads required. Join meetings directly from your browser',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-xl bg-card border border-border hover:shadow-medium hover:border-primary/20 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl gradient-hero p-12 text-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to transform your meetings?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of teams already using ConnectMeet for their daily collaboration
              </p>
              <Button
                size="xl"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                asChild
              >
                <Link to="/register">Get Started Free</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
              <Video className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">ConnectMeet</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2024 ConnectMeet. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
