import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AIAssistant } from "@/components/AIAssistant";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnimatedCard, StaggeredContainer, GlowButton, PulseIcon } from "@/components/AnimatedComponents";
import { LogOut, Users, CheckSquare, BarChart3, Settings, Upload, FileText, Bot, Sparkles } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Get user profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load user profile",
          variant: "destructive",
        });
      } else if (profile) {
        setUserRole(profile.role);
        setUserName(profile.full_name);
      }

      setIsLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully signed out.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const getRoleTitle = () => {
    switch (userRole) {
      case "beadle": return "Beadle Dashboard";
      case "adviser": return "Adviser Dashboard";
      case "coordinator": return "Coordinator Dashboard";
      case "admin": return "Admin Dashboard";
      default: return "Dashboard";
    }
  };

  const getWelcomeMessage = () => {
    switch (userRole) {
      case "beadle": return "Record attendance for your assigned section.";
      case "adviser": return "Review attendance submissions and manage your sections.";
      case "coordinator": return "View analytics and manage all sections.";
      case "admin": return "Manage users, roles, and system configuration.";
      default: return "Welcome to POD AI Monitoring System";
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text">{getRoleTitle()}</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {userName}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <StaggeredContainer className="space-y-6">
          {/* Welcome Card */}
          <AnimatedCard variant="glass" className="bg-gradient-to-r from-primary/10 to-accent/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PulseIcon pulseColor="primary">
                  <Sparkles className="h-6 w-6 text-primary" />
                </PulseIcon>
                Welcome to POD AI
              </CardTitle>
              <CardDescription>{getWelcomeMessage()}</CardDescription>
            </CardHeader>
          </AnimatedCard>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {userRole === "beadle" && (
              <AnimatedCard 
                delay={0.1}
                className="cursor-pointer"
                onClick={() => navigate("/attendance")}
              >
                <CardHeader>
                  <PulseIcon pulseColor="success">
                  <CheckSquare className="h-8 w-8 text-success mb-2" />
                  </PulseIcon>
                  <CardTitle className="text-lg">Mark Attendance</CardTitle>
                  <CardDescription>Record attendance for today</CardDescription>
                </CardHeader>
              </AnimatedCard>
            )}

            {userRole === "adviser" && (
              <AnimatedCard 
                delay={0.2}
                className="cursor-pointer"
                onClick={() => navigate("/adviser-dashboard")}
              >
                <CardHeader>
                  <PulseIcon pulseColor="accent">
                  <Users className="h-8 w-8 text-accent mb-2" />
                  </PulseIcon>
                  <CardTitle className="text-lg">Adviser Dashboard</CardTitle>
                  <CardDescription>Manage students and view alerts</CardDescription>
                </CardHeader>
              </AnimatedCard>
            )}

            {(userRole === "adviser" || userRole === "coordinator" || userRole === "admin") && (
              <>
                <AnimatedCard 
                  delay={0.2}
                  className="cursor-pointer"
                  onClick={() => navigate("/analytics")}
                >
                  <CardHeader>
                    <PulseIcon pulseColor="accent">
                    <BarChart3 className="h-8 w-8 text-accent mb-2" />
                    </PulseIcon>
                    <CardTitle className="text-lg">Analytics</CardTitle>
                    <CardDescription>Attendance analytics and insights</CardDescription>
                  </CardHeader>
                </AnimatedCard>

                <AnimatedCard 
                  delay={0.3}
                  className="cursor-pointer"
                  onClick={() => navigate("/csv-upload")}
                >
                  <CardHeader>
                    <PulseIcon pulseColor="primary">
                      <Upload className="h-8 w-8 text-primary mb-2" />
                    </PulseIcon>
                    <CardTitle className="text-lg">CSV Upload</CardTitle>
                    <CardDescription>Bulk import student data</CardDescription>
                  </CardHeader>
                </AnimatedCard>

                <AnimatedCard 
                  delay={0.4}
                  className="cursor-pointer"
                  onClick={() => navigate("/file-storage")}
                >
                  <CardHeader>
                    <PulseIcon pulseColor="warning">
                      <FileText className="h-8 w-8 text-warning mb-2" />
                    </PulseIcon>
                    <CardTitle className="text-lg">File Storage</CardTitle>
                    <CardDescription>Manage documents and reports</CardDescription>
                  </CardHeader>
                </AnimatedCard>
              </>
            )}

            {(userRole === "coordinator" || userRole === "admin") && (
              <AnimatedCard delay={0.5} className="cursor-pointer">
                <CardHeader>
                  <PulseIcon pulseColor="warning">
                  <Settings className="h-8 w-8 text-warning mb-2" />
                  </PulseIcon>
                  <CardTitle className="text-lg">Settings</CardTitle>
                  <CardDescription>Configure system settings</CardDescription>
                </CardHeader>
              </AnimatedCard>
            )}
          </div>

          {/* AI Assistant Notice */}
          <AnimatedCard delay={0.6} variant="neon">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PulseIcon pulseColor="primary">
                  <Bot className="h-6 w-6 text-primary" />
                </PulseIcon>
                AI Assistant Ready
              </CardTitle>
              <CardDescription>
                Your AI assistant is now powered with real attendance data analysis! 
                Click the chat button in the bottom right to get insights about attendance patterns, 
                trends, and student performance.
              </CardDescription>
            </CardHeader>
          </AnimatedCard>
        </StaggeredContainer>
      </main>

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
}
