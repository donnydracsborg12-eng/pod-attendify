import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, Upload, TrendingUp, MessageCircle, Send, Bot, Check } from "lucide-react";
import { ProofUploadModal } from "@/components/ProofUploadModal";
import { Progress } from "@/components/ui/progress";
import { AnimatedCard } from "@/components/AnimatedComponents";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

interface AttendanceRecord {
  student_id: string;
  present: boolean;
  absent: boolean;
  proof_url?: string;
  saving?: boolean;
}

interface Section {
  id: string;
  name: string;
  grade_level: string;
  school_year: string;
}

export default function Attendance() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [section, setSection] = useState<Section | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [weeklyTrend, setWeeklyTrend] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/auth");
          return;
        }

        // Get first section
        const { data: sections } = await supabase
          .from("sections")
          .select("*")
          .limit(1);

        if (sections && sections.length > 0) {
          const currentSection = sections[0];
          setSection(currentSection);

          // Fetch students
          const { data: studentsData, error } = await supabase
            .from("students")
            .select("*")
            .eq("section_id", currentSection.id)
            .order("last_name");

          if (error) throw error;

          setStudents(studentsData || []);

          // Initialize attendance records
          const initialRecords: Record<string, AttendanceRecord> = {};
          studentsData?.forEach(student => {
            initialRecords[student.id] = {
              student_id: student.id,
              present: false,
              absent: false,
            };
          });
          setAttendanceRecords(initialRecords);

          // Calculate weekly trend
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const { data: weeklyData } = await supabase
            .from("attendance")
            .select("status")
            .eq("section_id", currentSection.id)
            .gte("date", weekAgo.toISOString().split('T')[0]);

          if (weeklyData) {
            const presentCount = weeklyData.filter(r => r.status === 'present').length;
            const totalCount = weeklyData.length;
            setWeeklyTrend(totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load attendance data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate, toast]);

  const handleToggle = async (studentId: string, type: 'present' | 'absent') => {
    const record = attendanceRecords[studentId];
    const newValue = type === 'present' ? !record.present : !record.absent;
    
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [type]: newValue,
        [type === 'present' ? 'absent' : 'present']: false,
        saving: true,
      }
    }));

    // Simulate instant save animation
    setTimeout(() => {
      setAttendanceRecords(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          saving: false,
        }
      }));
    }, 500);
  };

  const handleUploadClick = (student: Student) => {
    setSelectedStudent(student);
    setUploadModalOpen(true);
  };

  const handleUploadComplete = (url: string) => {
    if (selectedStudent) {
      setAttendanceRecords(prev => ({
        ...prev,
        [selectedStudent.id]: {
          ...prev[selectedStudent.id],
          proof_url: url,
        }
      }));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !section) return;

      const records = Object.entries(attendanceRecords)
        .filter(([_, record]) => record.present || record.absent)
        .map(([studentId, record]) => ({
          student_id: studentId,
          section_id: section.id,
          date: selectedDate,
          status: record.present ? 'present' : 'absent',
          proof_url: record.proof_url || null,
          submitted_by: session.user.id,
        }));

      if (records.length === 0) {
        toast({
          title: "No records to submit",
          description: "Please mark attendance for at least one student",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Delete existing records for this date
      await supabase
        .from("attendance")
        .delete()
        .eq("section_id", section.id)
        .eq("date", selectedDate);

      const { error } = await supabase
        .from("attendance")
        .insert(records);

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error submitting attendance:", error);
      toast({
        title: "Error",
        description: "Failed to submit attendance",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiMessage = async () => {
    if (!aiMessage.trim()) return;

    setAiResponse("Analyzing attendance data...");
    
    // Simulate AI response
    setTimeout(() => {
      const markedCount = Object.values(attendanceRecords).filter(r => r.present || r.absent).length;
      const totalCount = students.length;
      const submissionPercent = totalCount > 0 ? Math.round((markedCount / totalCount) * 100) : 0;
      
      setAiResponse(`📊 **Attendance Summary**\n\n✅ Marked: ${markedCount}/${totalCount} students (${submissionPercent}%)\n📈 Weekly Trend: ${weeklyTrend}%\n\n${submissionPercent === 100 ? "🎉 All students marked! Ready to submit." : "⚠️ Some students still need to be marked."}`);
    }, 1000);

    setAiMessage("");
  };

  const submissionPercent = students.length > 0 
    ? Math.round((Object.values(attendanceRecords).filter(r => r.present || r.absent).length / students.length) * 100)
    : 0;

  const isComplete = submissionPercent === 100;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading attendance data...</p>
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
              <h1 className="text-2xl font-bold gradient-text">Beadle Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {section?.name} - {section?.grade_level} ({section?.school_year})
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatedCard
              className={cn(
                "transition-all duration-300",
                isComplete ? "bg-blue-500/10 border-blue-500" : "bg-red-500/10 border-red-500"
              )}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Today's Submission</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{submissionPercent}%</span>
                    <CheckCircle className={cn(
                      "h-8 w-8",
                      isComplete ? "text-blue-500" : "text-red-500"
                    )} />
                  </div>
                  <Progress value={submissionPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {Object.values(attendanceRecords).filter(r => r.present || r.absent).length} / {students.length} students marked
                  </p>
                </div>
              </CardContent>
            </AnimatedCard>

            <AnimatedCard>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Weekly Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{weeklyTrend}%</div>
                  <Progress value={weeklyTrend} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Average attendance rate (last 7 days)
                  </p>
                </div>
              </CardContent>
            </AnimatedCard>
          </div>

          {/* Attendance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Table</CardTitle>
              <CardDescription>
                Mark attendance for each student. Toggle checkboxes to mark present/absent and upload proof.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Student Name</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Proof Upload</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const record = attendanceRecords[student.id];
                      return (
                        <TableRow key={student.id} className={cn(
                          "transition-colors",
                          record?.saving && "bg-primary/5"
                        )}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {record?.saving && (
                                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                              )}
                              {student.first_name} {student.last_name}
                              {student.middle_name && ` ${student.middle_name}`}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={record?.present || false}
                                onCheckedChange={() => handleToggle(student.id, 'present')}
                                className={cn(
                                  "h-6 w-6 transition-all",
                                  record?.present && "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                )}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={record?.absent || false}
                                onCheckedChange={() => handleToggle(student.id, 'absent')}
                                className={cn(
                                  "h-6 w-6 transition-all",
                                  record?.absent && "data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                                )}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUploadClick(student)}
                              className="gap-2"
                            >
                              {record?.proof_url ? (
                                <>
                                  <Check className="h-4 w-4 text-green-500" />
                                  Uploaded
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4" />
                                  Upload Proof
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              size="lg"
              className={cn(
                "relative transition-all",
                !isComplete && "shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-pulse"
              )}
            >
              {!isComplete && (
                <span className="absolute inset-0 rounded-md bg-blue-400 opacity-75 blur-lg animate-pulse" />
              )}
              <span className="relative flex items-center gap-2">
                {isSubmitting ? "Submitting..." : "Submit Attendance"}
              </span>
            </Button>
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
          <Card className="w-80 shadow-2xl">
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
              {aiResponse && (
                <div className="bg-muted p-3 rounded-lg text-sm whitespace-pre-line">
                  {aiResponse}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Did everyone submit today?"
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

      {/* Success Dialog */}
      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <AlertDialogTitle className="text-center">Success!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              ✅ Attendance Saved Successfully
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Modal */}
      {selectedStudent && section && (
        <ProofUploadModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          studentId={selectedStudent.id}
          studentName={`${selectedStudent.first_name} ${selectedStudent.last_name}`}
          sectionId={section.id}
          date={selectedDate}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
