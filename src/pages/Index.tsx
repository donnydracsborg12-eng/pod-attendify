import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, CheckCircle, BarChart, Users, Sparkles } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="container mx-auto text-center space-y-6 animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-r from-primary via-[hsl(280,75%,68%)] to-accent flex items-center justify-center shadow-[var(--shadow-glow)] animate-float">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-4">
            POD AI Monitoring
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            School Attendance System with AI-Powered Insights
          </p>
          
          <div className="flex gap-4 justify-center pt-6">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              Get Started
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Powerful Features for Every Role
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-soft p-6 space-y-4 animate-slide-up">
              <div className="h-12 w-12 rounded-lg bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold">Easy Attendance Tracking</h3>
              <p className="text-muted-foreground">
                Beadles can quickly mark attendance with proof uploads and instant submissions.
              </p>
            </div>

            <div className="card-soft p-6 space-y-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <BarChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Analytics Dashboard</h3>
              <p className="text-muted-foreground">
                Coordinators get comprehensive insights with charts and trend analysis.
              </p>
            </div>

            <div className="card-soft p-6 space-y-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="h-12 w-12 rounded-lg bg-accent/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold">Role-Based Access</h3>
              <p className="text-muted-foreground">
                Secure access control with tailored interfaces for Beadles, Advisers, Coordinators, and Admins.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI-Powered</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold">
            Ask Questions, Get Instant Answers
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI assistant helps you find insights quickly. Ask about missing submissions, 
            attendance trends, or get personalized recommendations.
          </p>

          <div className="pt-6">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-primary to-accent"
            >
              Try POD AI Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2025 POD AI Monitoring System. Built with Lovable Cloud.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
