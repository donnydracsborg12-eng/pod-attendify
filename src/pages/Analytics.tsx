import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, TrendingUp, TrendingDown, Users, Calendar, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface AttendanceStats {
  date: string;
  present: number;
  absent: number;
  total: number;
  attendanceRate: number;
}

interface StudentAttendance {
  student_id: string;
  student_name: string;
  student_number: string;
  present_days: number;
  absent_days: number;
  total_days: number;
  attendance_rate: number;
}

interface Section {
  id: string;
  name: string;
  grade_level: string;
  school_year: string;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

export default function Analytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendance[]>([]);
  const [dateRange, setDateRange] = useState("30"); // days
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const { data, error } = await supabase
          .from("sections")
          .select("*")
          .order("name");

        if (error) throw error;
        setSections(data || []);
        
        if (data && data.length > 0) {
          setSelectedSection(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching sections:", error);
        toast({
          title: "Error",
          description: "Failed to load sections",
          variant: "destructive",
        });
      }
    };

    fetchSections();
  }, [toast]);

  useEffect(() => {
    if (selectedSection) {
      fetchAttendanceData();
    }
  }, [selectedSection, dateRange]);

  const fetchAttendanceData = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Fetch daily attendance stats
      const { data: dailyStats, error: statsError } = await supabase
        .from("attendance")
        .select(`
          date,
          status,
          students!inner(student_number, first_name, last_name)
        `)
        .eq("section_id", selectedSection)
        .gte("date", startDate.toISOString().split('T')[0])
        .lte("date", endDate.toISOString().split('T')[0]);

      if (statsError) throw statsError;

      // Process daily stats
      const statsMap = new Map<string, { present: number; absent: number; total: number }>();
      
      dailyStats?.forEach(record => {
        const date = record.date;
        if (!statsMap.has(date)) {
          statsMap.set(date, { present: 0, absent: 0, total: 0 });
        }
        
        const stats = statsMap.get(date)!;
        stats.total++;
        if (record.status === 'present') {
          stats.present++;
        } else {
          stats.absent++;
        }
      });

      const processedStats: AttendanceStats[] = Array.from(statsMap.entries())
        .map(([date, stats]) => ({
          date,
          present: stats.present,
          absent: stats.absent,
          total: stats.total,
          attendanceRate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setAttendanceStats(processedStats);

      // Fetch student attendance summary
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select(`
          id,
          student_number,
          first_name,
          last_name,
          attendance!inner(status)
        `)
        .eq("section_id", selectedSection);

      if (studentsError) throw studentsError;

      // Process student attendance
      const studentMap = new Map<string, StudentAttendance>();
      
      students?.forEach(student => {
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            student_id: student.id,
            student_name: `${student.first_name} ${student.last_name}`,
            student_number: student.student_number,
            present_days: 0,
            absent_days: 0,
            total_days: 0,
            attendance_rate: 0
          });
        }

        const studentStats = studentMap.get(student.id)!;
        // attendance is an array, iterate through it
        const attendanceArray = Array.isArray(student.attendance) ? student.attendance : [student.attendance];
        attendanceArray.forEach((att: any) => {
          studentStats.total_days++;
          if (att.status === 'present') {
            studentStats.present_days++;
          } else {
            studentStats.absent_days++;
          }
        });
      });

      // Calculate attendance rates
      const processedStudents = Array.from(studentMap.values()).map(student => ({
        ...student,
        attendance_rate: student.total_days > 0 ? (student.present_days / student.total_days) * 100 : 0
      }));

      setStudentAttendance(processedStudents);

    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getOverallStats = () => {
    const totalPresent = attendanceStats.reduce((sum, stat) => sum + stat.present, 0);
    const totalAbsent = attendanceStats.reduce((sum, stat) => sum + stat.absent, 0);
    const totalDays = totalPresent + totalAbsent;
    const overallRate = totalDays > 0 ? (totalPresent / totalDays) * 100 : 0;

    return {
      totalPresent,
      totalAbsent,
      totalDays,
      overallRate
    };
  };

  const getAttendanceTrend = () => {
    if (attendanceStats.length < 2) return 0;
    
    const recent = attendanceStats.slice(-7); // Last 7 days
    const older = attendanceStats.slice(-14, -7); // Previous 7 days
    
    const recentAvg = recent.reduce((sum, stat) => sum + stat.attendanceRate, 0) / recent.length;
    const olderAvg = older.reduce((sum, stat) => sum + stat.attendanceRate, 0) / older.length;
    
    return recentAvg - olderAvg;
  };

  const pieData = [
    { name: 'Present', value: getOverallStats().totalPresent, color: '#10b981' },
    { name: 'Absent', value: getOverallStats().totalAbsent, color: '#ef4444' },
  ];

  const selectedSectionData = sections.find(s => s.id === selectedSection);
  const overallStats = getOverallStats();
  const trend = getAttendanceTrend();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
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
              <h1 className="text-2xl font-bold gradient-text">Analytics Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Attendance insights and trends
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex gap-4 items-center">
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name} - {section.grade_level} ({section.school_year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Overall Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.overallRate.toFixed(1)}%</div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {trend > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  {Math.abs(trend).toFixed(1)}% vs last week
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Total Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.totalDays}</div>
                <p className="text-sm text-muted-foreground">Days tracked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Present
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{overallStats.totalPresent}</div>
                <p className="text-sm text-muted-foreground">Total present</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Absent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{overallStats.totalAbsent}</div>
                <p className="text-sm text-muted-foreground">Total absent</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Attendance Trend
                </CardTitle>
                <CardDescription>
                  Daily attendance rate over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={attendanceStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Attendance Rate']}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="attendanceRate" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Attendance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Attendance Distribution
                </CardTitle>
                <CardDescription>
                  Overall present vs absent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Student Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Student Attendance Summary</CardTitle>
              <CardDescription>
                Individual student attendance rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {studentAttendance
                  .sort((a, b) => b.attendance_rate - a.attendance_rate)
                  .map((student) => (
                    <div key={student.student_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{student.student_number}</Badge>
                        <span className="font-medium">{student.student_name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          {student.present_days}/{student.total_days} days
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${student.attendance_rate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {student.attendance_rate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
