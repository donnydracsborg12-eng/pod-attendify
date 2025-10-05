import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, FileText, CheckCircle, XCircle, Download } from "lucide-react";

interface StudentData {
  student_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
}

interface Section {
  id: string;
  name: string;
  grade_level: string;
  school_year: string;
}

interface UploadResult {
  success: number;
  errors: string[];
  total: number;
}

export default function CSVUpload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [csvData, setCsvData] = useState<StudentData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [fileName, setFileName] = useState("");

  useState(() => {
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
  });

  const parseCSV = (csvText: string): StudentData[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data: StudentData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 3) continue;

      const student: StudentData = {
        student_number: values[0] || '',
        first_name: values[1] || '',
        last_name: values[2] || '',
        middle_name: values[3] || undefined
      };

      data.push(student);
    }

    return data;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const parsedData = parseCSV(csvText);
      setCsvData(parsedData);
      
      toast({
        title: "File loaded",
        description: `Found ${parsedData.length} students in the CSV file`,
      });
    };
    reader.readAsText(file);
  };

  const uploadStudents = async () => {
    if (!selectedSection || csvData.length === 0) {
      toast({
        title: "Error",
        description: "Please select a section and upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const result: UploadResult = { success: 0, errors: [], total: csvData.length };

    try {
      for (let i = 0; i < csvData.length; i++) {
        const student = csvData[i];
        
        // Validate required fields
        if (!student.student_number || !student.first_name || !student.last_name) {
          result.errors.push(`Row ${i + 2}: Missing required fields (student_number, first_name, last_name)`);
          continue;
        }

        // Check if student already exists
        const { data: existingStudent } = await supabase
          .from("students")
          .select("id")
          .eq("student_number", student.student_number)
          .single();

        if (existingStudent) {
          result.errors.push(`Row ${i + 2}: Student ${student.student_number} already exists`);
          continue;
        }

        // Insert new student
        const { error } = await supabase
          .from("students")
          .insert({
            section_id: selectedSection,
            student_number: student.student_number,
            first_name: student.first_name,
            last_name: student.last_name,
            middle_name: student.middle_name || null
          });

        if (error) {
          result.errors.push(`Row ${i + 2}: ${error.message}`);
        } else {
          result.success++;
        }

        setUploadProgress(((i + 1) / csvData.length) * 100);
      }

      setUploadResult(result);
      
      if (result.success > 0) {
        toast({
          title: "Upload completed",
          description: `Successfully uploaded ${result.success} students`,
        });
      }

      if (result.errors.length > 0) {
        toast({
          title: "Some errors occurred",
          description: `${result.errors.length} students failed to upload`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("Error uploading students:", error);
      toast({
        title: "Error",
        description: "Failed to upload students",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = "student_number,first_name,last_name,middle_name\n2024-001,John,Doe,Michael\n2024-002,Jane,Smith,Sarah\n2024-003,Bob,Johnson,";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const selectedSectionData = sections.find(s => s.id === selectedSection);

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
              <h1 className="text-2xl font-bold gradient-text">CSV Upload</h1>
              <p className="text-sm text-muted-foreground">
                Bulk import students from CSV file
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Upload Instructions
              </CardTitle>
              <CardDescription>
                Follow these steps to upload student data from a CSV file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">1</div>
                  <h3 className="font-semibold mb-2">Download Template</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Get the CSV template with the correct format
                  </p>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">2</div>
                  <h3 className="font-semibold mb-2">Fill Your Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Add your student information to the CSV file
                  </p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">3</div>
                  <h3 className="font-semibold mb-2">Upload & Import</h3>
                  <p className="text-sm text-muted-foreground">
                    Select section and upload your CSV file
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">CSV Format Requirements:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• First row must contain headers: student_number, first_name, last_name, middle_name</li>
                  <li>• student_number, first_name, and last_name are required</li>
                  <li>• middle_name is optional</li>
                  <li>• Each student must have a unique student_number</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Students</CardTitle>
              <CardDescription>
                Select a section and upload your CSV file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="section">Select Section</Label>
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name} - {section.grade_level} ({section.school_year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">CSV File</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                  {fileName && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {fileName}
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={uploadStudents}
                disabled={!selectedSection || csvData.length === 0 || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-pulse" />
                    Uploading... {uploadProgress.toFixed(0)}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {csvData.length} Students
                  </>
                )}
              </Button>

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-center text-muted-foreground">
                    Processing students...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Data */}
          {csvData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview Data</CardTitle>
                <CardDescription>
                  Review the data before uploading ({csvData.length} students)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Number</TableHead>
                        <TableHead>First Name</TableHead>
                        <TableHead>Last Name</TableHead>
                        <TableHead>Middle Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 10).map((student, index) => (
                        <TableRow key={index}>
                          <TableCell>{student.student_number}</TableCell>
                          <TableCell>{student.first_name}</TableCell>
                          <TableCell>{student.last_name}</TableCell>
                          <TableCell>{student.middle_name || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {csvData.length > 10 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      ... and {csvData.length - 10} more students
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {uploadResult.success > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  Upload Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{uploadResult.success}</div>
                    <p className="text-sm text-muted-foreground">Successfully Uploaded</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{uploadResult.errors.length}</div>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{uploadResult.total}</div>
                    <p className="text-sm text-muted-foreground">Total Processed</p>
                  </div>
                </div>

                {uploadResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Errors:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {uploadResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
