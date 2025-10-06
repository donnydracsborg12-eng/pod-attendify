import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, Clock, Users, Calendar } from "lucide-react";

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
  status: 'present' | 'absent';
  notes?: string;
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user's profile to determine which section they manage
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/auth");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (!profile) {
          toast({
            title: "Error",
            description: "User profile not found",
            variant: "destructive",
          });
          return;
        }

        // For now, let's get the first section for demonstration
        // In a real app, you'd filter by user's assigned section
        const { data: sections } = await supabase
          .from("sections")
          .select("*")
          .limit(1);

        if (sections && sections.length > 0) {
          const currentSection = sections[0];
          setSection(currentSection);

          // Fetch students for this section
          const { data: studentsData, error } = await supabase
            .from("students")
            .select("*")
            .eq("section_id", currentSection.id)
            .order("last_name");

          if (error) {
            throw error;
          }

          setStudents(studentsData || []);

          // Load existing attendance for the selected date
          if (studentsData) {
            const { data: existingAttendance } = await supabase
              .from("attendance")
              .select("*")
              .eq("section_id", currentSection.id)
              .eq("date", selectedDate);

            const attendanceMap: Record<string, AttendanceRecord> = {};
            existingAttendance?.forEach(record => {
              attendanceMap[record.student_id] = {
                student_id: record.student_id,
                status: (record.status as 'present' | 'absent'),
                notes: record.notes || undefined
              };
            });

            setAttendanceRecords(attendanceMap);
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
  }, [navigate, toast, selectedDate]);

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        student_id: studentId,
        status,
        notes: prev[studentId]?.notes || ""
      }
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        student_id: studentId,
        status: prev[studentId]?.status || 'present',
        notes
      }
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !section) return;

      const records = Object.values(attendanceRecords);
      
      // Delete existing records for this date and section
      await supabase
        .from("attendance")
        .delete()
        .eq("section_id", section.id)
        .eq("date", selectedDate);

      // Insert new records
      const attendanceData = records.map(record => ({
        student_id: record.student_id,
        section_id: section.id,
        date: selectedDate,
        status: record.status,
        notes: record.notes || null,
        submitted_by: session.user.id
      }));

      const { error } = await supabase
        .from("attendance")
        .insert(attendanceData);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Attendance recorded for ${records.length} students`,
      });

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

  const filteredStudents = students.filter(student =>
    `${student.first_name} ${student.last_name} ${student.student_number}`.toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const presentCount = Object.values(attendanceRecords).filter(r => r.status === 'present').length;
  const absentCount = Object.values(attendanceRecords).filter(r => r.status === 'absent').length;
  const totalCount = students.length;

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
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Mark Attendance</h1>
              <p className="text-sm text-muted-foreground">
                {section?.name} - {section?.grade_level} ({section?.school_year})
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Date Selection and Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Present
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{presentCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Absent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{absentCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Student List</CardTitle>
              <CardDescription>
                Mark attendance for each student. Use the search to find specific students.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Search students by name or student number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />

                <div className="space-y-2">
                  {filteredStudents.map((student) => {
                    const record = attendanceRecords[student.id];
                    const isPresent = record?.status === 'present';
                    const isAbsent = record?.status === 'absent';

                    return (
                      <Card key={student.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isPresent}
                                onCheckedChange={(checked) => 
                                  handleAttendanceChange(student.id, checked ? 'present' : 'absent')
                                }
                              />
                              <Label className="text-sm font-medium">
                                {student.first_name} {student.last_name}
                                {student.middle_name && ` ${student.middle_name}`}
                              </Label>
                            </div>
                            <Badge variant="outline">{student.student_number}</Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant={isPresent ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleAttendanceChange(student.id, 'present')}
                              className="text-green-600"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Present
                            </Button>
                            <Button
                              variant={isAbsent ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleAttendanceChange(student.id, 'absent')}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Absent
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3">
                          <Textarea
                            placeholder="Add notes (optional)..."
                            value={record?.notes || ""}
                            onChange={(e) => handleNotesChange(student.id, e.target.value)}
                            className="min-h-[60px]"
                          />
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {filteredStudents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No students found matching your search.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || Object.keys(attendanceRecords).length === 0}
              size="lg"
              className="bg-gradient-to-r from-primary to-accent"
            >
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Attendance
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
