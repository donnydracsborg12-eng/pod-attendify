import { useState } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  isLoading?: boolean;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your POD AI assistant. I can help you with attendance insights, student data analysis, and answer questions about your school's attendance patterns. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getAttendanceInsights = async (query: string): Promise<string> => {
    try {
      // Get recent attendance data
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select(`
          date,
          status,
          students!inner(first_name, last_name, student_number),
          sections!inner(name, grade_level)
        `)
        .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order("date", { ascending: false })
        .limit(100);

      if (!attendanceData || attendanceData.length === 0) {
        return "I don't have any recent attendance data to analyze. Please make sure attendance records have been entered.";
      }

      // Calculate basic statistics
      const totalRecords = attendanceData.length;
      const presentCount = attendanceData.filter(r => r.status === 'present').length;
      const absentCount = totalRecords - presentCount;
      const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

      // Get unique students
      const uniqueStudents = new Set(attendanceData.map(r => r.students.student_number)).size;

      // Analyze patterns
      const recentDays = attendanceData.slice(0, 7);
      const recentPresent = recentDays.filter(r => r.status === 'present').length;
      const recentRate = recentDays.length > 0 ? (recentPresent / recentDays.length) * 100 : 0;

      // Generate insights based on query
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes('rate') || lowerQuery.includes('percentage')) {
        return `Based on the last 30 days of data:\n\n📊 **Overall Attendance Rate**: ${attendanceRate.toFixed(1)}%\n📈 **Recent Trend (7 days)**: ${recentRate.toFixed(1)}%\n👥 **Total Students**: ${uniqueStudents}\n📅 **Records Analyzed**: ${totalRecords}\n\n${recentRate > attendanceRate ? '✅ Attendance is improving recently!' : recentRate < attendanceRate ? '⚠️ Attendance has declined recently.' : '📊 Attendance is stable.'}`;
      }

      if (lowerQuery.includes('absent') || lowerQuery.includes('missing')) {
        const absentStudents = attendanceData.filter(r => r.status === 'absent');
        const frequentAbsentees = absentStudents.reduce((acc, record) => {
          const student = record.students;
          const key = `${student.first_name} ${student.last_name}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const topAbsentees = Object.entries(frequentAbsentees)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3);

        return `📉 **Absence Analysis**:\n\n• Total Absences: ${absentCount}\n• Absence Rate: ${((absentCount / totalRecords) * 100).toFixed(1)}%\n\n🔍 **Students with Most Absences**:\n${topAbsentees.map(([name, count]) => `• ${name}: ${count} days`).join('\n')}\n\n💡 **Recommendation**: Consider reaching out to students with frequent absences to understand any challenges they might be facing.`;
      }

      if (lowerQuery.includes('trend') || lowerQuery.includes('pattern')) {
        const dailyStats = attendanceData.reduce((acc, record) => {
          const date = record.date;
          if (!acc[date]) {
            acc[date] = { present: 0, total: 0 };
          }
          acc[date].total++;
          if (record.status === 'present') {
            acc[date].present++;
          }
          return acc;
        }, {} as Record<string, { present: number; total: number }>);

        const dailyRates = Object.entries(dailyStats)
          .map(([date, stats]) => ({
            date,
            rate: (stats.present / stats.total) * 100
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-7);

        const trendDirection = dailyRates.length > 1 
          ? dailyRates[dailyRates.length - 1].rate > dailyRates[0].rate ? 'improving' : 'declining'
          : 'stable';

        return `📈 **Attendance Trend Analysis**:\n\n• **Overall Rate**: ${attendanceRate.toFixed(1)}%\n• **Recent Trend**: ${trendDirection}\n• **Last 7 Days**:\n${dailyRates.map(d => `  ${new Date(d.date).toLocaleDateString()}: ${d.rate.toFixed(1)}%`).join('\n')}\n\n${trendDirection === 'improving' ? '🎉 Great! Attendance is trending upward.' : trendDirection === 'declining' ? '⚠️ Attendance is declining - consider intervention strategies.' : '📊 Attendance is stable.'}`;
      }

      // Default response with general insights
      return `📊 **Attendance Overview**:\n\n• **Overall Rate**: ${attendanceRate.toFixed(1)}%\n• **Total Students**: ${uniqueStudents}\n• **Records**: ${totalRecords} entries\n• **Recent Performance**: ${recentRate.toFixed(1)}% (last 7 days)\n\n💡 **Quick Insights**:\n${attendanceRate >= 90 ? '✅ Excellent attendance rate!' : attendanceRate >= 80 ? '👍 Good attendance rate' : '⚠️ Attendance needs attention'}\n\nAsk me about specific patterns, trends, or student performance!`;

    } catch (error) {
      console.error("Error fetching attendance data:", error);
      return "I'm having trouble accessing the attendance data right now. Please try again later.";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      role: "user", 
      content: input,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMessage]);
    
    setIsLoading(true);
    const loadingMessage: Message = {
        role: "assistant",
      content: "",
      isLoading: true,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      // Generate AI response based on query
      const aiResponse = await getAttendanceInsights(input);
      
      // Remove loading message and add real response
      setMessages((prev) => {
        const withoutLoading = prev.filter(m => !m.isLoading);
        return [...withoutLoading, {
          role: "assistant",
          content: aiResponse,
          timestamp: new Date()
        }];
      });

    } catch (error) {
      console.error("Error generating AI response:", error);
      setMessages((prev) => {
        const withoutLoading = prev.filter(m => !m.isLoading);
        return [...withoutLoading, {
          role: "assistant",
          content: "I'm sorry, I encountered an error while processing your request. Please try again.",
          timestamp: new Date()
        }];
      });
    } finally {
      setIsLoading(false);
    }

    setInput("");
  };

  return (
    <>
      {/* Floating AI Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full shadow-[var(--shadow-lg)] hover:shadow-[var(--shadow-glow)] animate-float bg-gradient-to-r from-primary to-accent"
            size="icon"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* AI Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-card rounded-[var(--radius)] shadow-[var(--shadow-lg)] border border-border flex flex-col animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-[var(--radius)]">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">POD AI Assistant</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex items-start gap-2 max-w-[80%]">
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                      {message.isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-current rounded-full animate-bounce" />
                          <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.timestamp && (
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about attendance patterns, rates, trends..."
                className="min-h-[60px] resize-none"
              />
              <Button
                onClick={handleSend}
                size="icon"
                className="h-[60px] w-[60px] shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
