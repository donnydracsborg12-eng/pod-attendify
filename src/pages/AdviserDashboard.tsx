import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bot, Send, MessageCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MasterlistUpload } from "@/components/MasterlistUpload";
import { StudentManagementTable } from "@/components/StudentManagementTable";
import { AlertsPanel } from "@/components/AlertsPanel";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  section_id: string;
}

interface Section {
  id: string;
  name: string;
  grade_level: string;
  school_year: string;
  completionRate: number;
}

interface Alert {
  id: string;
  type: 'missing_report' | 'incomplete_data' | 'absent_students';
  title: string;
  description: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
}

export default function AdviserDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [section, setSection] = useState<Section | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [sectionsData, setSectionsData] = useState<Section[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/auth");
          return;
        }

        // Get first section for demo
        const { data: sections } = await supabase
          .from("sections")
          .select("*")
          .limit(1);

        if (sections && sections.length > 0) {
          const currentSection = sections[0];
          setSection({
            ...currentSection,
            completionRate: 85,
          });

          // Fetch students
          const { data: studentsData, error } = await supabase
            .from("students")
            .select("*")
            .eq("section_id", currentSection.id)
            .order("last_name");

          if (error) throw error;
          setStudents(studentsData || []);

          // Generate mock alerts
          const mockAlerts: Alert[] = [
            {
              id: '1',
              type: 'missing_report',
              title: 'Missing Attendance Reports',
              description: '3 sections have not submitted today',
              count: 3,
              severity: 'high',
            },
            {
              id: '2',
              type: 'incomplete_data',
              title: 'Incomplete Student Data',
              description: '5 students missing contact information',
              count: 5,
              severity: 'medium',
            },
          ];
          setAlerts(mockAlerts);

          // Generate mock sections data
          const mockSectionsData: Section[] = [
            { id: '1', name: 'Section A', grade_level: 'Grade 10', school_year: '2024-2025', completionRate: 95 },
            { id: '2', name: 'Section B', grade_level: 'Grade 10', school_year: '2024-2025', completionRate: 78 },
            { id: '3', name: 'Section C', grade_level: 'Grade 10', school_year: '2024-2025', completionRate: 62 },
            { id: '4', name: 'Section D', grade_level: 'Grade 10', school_year: '2024-2025', completionRate: 88 },
          ];
          setSectionsData(mockSectionsData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate, toast]);

  const handleStudentUpdate = async (student: Student) => {
    // Simulate update
    setStudents(prev => prev.map(s => s.id === student.id ? student : s));
  };

  const handleStudentDelete = async (studentId: string) => {
    // Simulate delete
    setStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const handleStudentCreate = async (student: Omit<Student, 'id'>) => {
    // Simulate create
    const newStudent: Student = {
      ...student,
      id: `temp_${Date.now()}`,
      section_id: section?.id || '',
    };
    setStudents(prev => [...prev, newStudent]);
  };

  const handleAiMessage = async () => {
    if (!aiMessage.trim()) return;

    setAiResponse("Analyzing sections data...");

    setTimeout(() => {
      const incompleteSections = sectionsData.filter(s => s.completionRate < 80);
      
      let response = "📊 **Sections Analysis**\n\n";
      
      if (incompleteSections.length > 0) {
        response += `⚠️ **${incompleteSections.length} sections with incomplete data:**\n\n`;
        response += "See the table below for details.";
      } else {
        response += "✅ All sections have complete data!";
      }

      setAiResponse(response);
    }, 1000);

    setAiMessage("");
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return "bg-green-500";
    if (rate >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Adviser Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {section?.name} - {section?.grade_level}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Masterlist Upload */}
            <MasterlistUpload
              sectionId={section?.id || ''}
              onUploadComplete={() => {
                toast({
                  title: "Success",
                  description: "Students data refreshed",
                });
              }}
            />

            {/* Student Management */}
            <StudentManagementTable
              students={students}
              onStudentUpdate={handleStudentUpdate}
              onStudentDelete={handleStudentDelete}
              onStudentCreate={handleStudentCreate}
            />

            {/* AI Sections Analysis */}
            {aiResponse && aiResponse.includes("table") && (
              <Card>
                <CardHeader>
                  <CardTitle>Sections with Incomplete Data</CardTitle>
                  <CardDescription>
                    Sections requiring attention based on completion rate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Section</TableHead>
                          <TableHead>Grade Level</TableHead>
                          <TableHead>Completion Rate</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sectionsData.filter(s => s.completionRate < 80).map((section) => (
                          <TableRow key={section.id}>
                            <TableCell className="font-medium">{section.name}</TableCell>
                            <TableCell>{section.grade_level}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span>{section.completionRate}%</span>
                                </div>
                                <Progress
                                  value={section.completionRate}
                                  className="h-2"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={cn(
                                "h-3 w-3 rounded-full",
                                getCompletionColor(section.completionRate)
                              )} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <AlertsPanel alerts={alerts} />
          </div>
        </div>
      </main>

      {/* AI Assistant Bubble */}
      <div className="fixed bottom-6 right-6 z-50">
        {!aiChatOpen ? (
          <Button
            onClick={() => setAiChatOpen(true)}
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform"
          >
            <Bot className="h-6 w-6" />
          </Button>
        ) : (
          <Card className="w-96 shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI Assistant
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAiChatOpen(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-lg text-xs italic">
                Try asking: "Show sections with incomplete data"
              </div>
              {aiResponse && (
                <div className="bg-muted p-3 rounded-lg text-sm whitespace-pre-line">
                  {aiResponse}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Ask me anything..."
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiMessage()}
                  className="flex-1"
                />
                <Button onClick={handleAiMessage} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
