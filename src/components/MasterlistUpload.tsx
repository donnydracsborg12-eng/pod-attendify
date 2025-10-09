import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ParsedStudent {
  student_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
}

interface MasterlistUploadProps {
  sectionId: string;
  onUploadComplete: () => void;
}

export function MasterlistUpload({ sectionId, onUploadComplete }: MasterlistUploadProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedStudent[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const parseCSV = (text: string): ParsedStudent[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const students: ParsedStudent[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const student: any = {};
      
      headers.forEach((header, index) => {
        if (header.includes('student') && header.includes('number')) {
          student.student_number = values[index];
        } else if (header.includes('first')) {
          student.first_name = values[index];
        } else if (header.includes('last')) {
          student.last_name = values[index];
        } else if (header.includes('middle')) {
          student.middle_name = values[index];
        }
      });
      
      if (student.student_number && student.first_name && student.last_name) {
        students.push(student);
      }
    }
    
    return students;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setPreviewData(parsed);
      };
      reader.readAsText(droppedFile);
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setPreviewData(parsed);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!previewData.length) return;

    setIsUploading(true);
    try {
      // Here you would make the actual API call to save students
      // For now, simulating the upload
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "Success",
        description: `${previewData.length} students uploaded successfully`,
      });

      setFile(null);
      setPreviewData([]);
      onUploadComplete();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload masterlist",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Masterlist Upload</CardTitle>
        <CardDescription>
          Upload a CSV file with student information (student_number, first_name, last_name, middle_name)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300",
            isDragging
              ? "border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
              : "border-border hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          )}
        >
          {file ? (
            <div className="space-y-2">
              <FileCheck className="h-12 w-12 mx-auto text-success" />
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {previewData.length} students parsed
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setPreviewData([]);
                }}
                className="mt-2"
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">
                Drag and drop your CSV file here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse
              </p>
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
                accept=".csv"
              />
              <label htmlFor="csv-upload">
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>
          )}
        </div>

        {previewData.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Preview ({previewData.length} students)</h3>
            <div className="border rounded-lg max-h-60 overflow-auto">
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
                  {previewData.slice(0, 10).map((student, index) => (
                    <TableRow key={index}>
                      <TableCell>{student.student_number}</TableCell>
                      <TableCell>{student.first_name}</TableCell>
                      <TableCell>{student.last_name}</TableCell>
                      <TableCell>{student.middle_name || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {previewData.length > 10 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  And {previewData.length - 10} more...
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isUploading ? "Uploading..." : `Upload ${previewData.length} Students`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
