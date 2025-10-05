import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AIAssistant } from "@/components/AIAssistant";
import { LogOut, Users, CheckSquare, BarChart3, Settings } from "lucide-react";

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
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6 animate-fade-in">
          {/* Welcome Card */}
          <Card className="card-soft bg-gradient-to-r from-primary/10 to-accent/10">
            <CardHeader>
              <CardTitle>Welcome to POD AI</CardTitle>
              <CardDescription>{getWelcomeMessage()}</CardDescription>
            </CardHeader>
          </Card>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {userRole === "beadle" && (
              <Card className="card-soft hover:scale-105 transition-transform cursor-pointer">
                <CardHeader>
                  <CheckSquare className="h-8 w-8 text-success mb-2" />
                  <CardTitle className="text-lg">Mark Attendance</CardTitle>
                  <CardDescription>Record attendance for today</CardDescription>
                </CardHeader>
              </Card>
            )}

            {(userRole === "adviser" || userRole === "coordinator" || userRole === "admin") && (
              <>
                <Card className="card-soft hover:scale-105 transition-transform cursor-pointer">
                  <CardHeader>
                    <Users className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-lg">Manage Students</CardTitle>
                    <CardDescription>View and manage student records</CardDescription>
                  </CardHeader>
                </Card>

                <Card className="card-soft hover:scale-105 transition-transform cursor-pointer">
                  <CardHeader>
                    <BarChart3 className="h-8 w-8 text-accent mb-2" />
                    <CardTitle className="text-lg">View Reports</CardTitle>
                    <CardDescription>Attendance analytics and insights</CardDescription>
                  </CardHeader>
                </Card>
              </>
            )}

            {(userRole === "coordinator" || userRole === "admin") && (
              <Card className="card-soft hover:scale-105 transition-transform cursor-pointer">
                <CardHeader>
                  <Settings className="h-8 w-8 text-warning mb-2" />
                  <CardTitle className="text-lg">Settings</CardTitle>
                  <CardDescription>Configure system settings</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>

          {/* Feature Coming Soon Notice */}
          <Card className="card-soft">
            <CardHeader>
              <CardTitle>🚀 Full Features Coming Soon</CardTitle>
              <CardDescription>
                Role-specific dashboards with complete attendance management, analytics, and AI-powered insights are being built. 
                Try the AI assistant to see a preview of what's coming!
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
}
