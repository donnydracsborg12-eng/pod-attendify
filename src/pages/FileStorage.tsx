import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Download, FileText, Image, File, Trash2, Eye, Plus } from "lucide-react";

interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploaded_by: string;
  uploaded_at: string;
  description?: string;
  category: string;
}

interface Section {
  id: string;
  name: string;
  grade_level: string;
  school_year: string;
}

const FILE_CATEGORIES = [
  'attendance_reports',
  'student_documents',
  'photos',
  'certificates',
  'other'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function FileStorage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadDescription, setUploadDescription] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch sections
        const { data: sectionsData, error: sectionsError } = await supabase
          .from("sections")
          .select("*")
          .order("name");

        if (sectionsError) throw sectionsError;
        setSections(sectionsData || []);

        // Fetch files
        const { data: filesData, error: filesError } = await supabase
          .from("stored_files")
          .select("*")
          .order("uploaded_at", { ascending: false });

        if (filesError) throw filesError;
        setFiles(filesData || []);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load file storage data",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [toast]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('attendance-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('attendance-files')
        .getPublicUrl(filePath);

      // Save file metadata to database
      const { data: fileData, error: dbError } = await supabase
        .from("stored_files")
        .insert({
          name: file.name,
          size: file.size,
          type: file.type,
          url: urlData.publicUrl,
          uploaded_by: session.user.id,
          description: uploadDescription || null,
          category: selectedCategory || 'other'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setFiles(prev => [fileData, ...prev]);
      setUploadProgress(100);

      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded`,
      });

      setIsUploadDialogOpen(false);
      setUploadDescription("");
      setSelectedCategory("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) return;

      // Delete from storage
      const filePath = file.url.split('/').pop();
      await supabase.storage
        .from('attendance-files')
        .remove([`uploads/${filePath}`]);

      // Delete from database
      const { error } = await supabase
        .from("stored_files")
        .delete()
        .eq("id", fileId);

      if (error) throw error;

      setFiles(prev => prev.filter(f => f.id !== fileId));

      toast({
        title: "File deleted",
        description: "File has been successfully deleted",
      });

    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (type.includes('pdf')) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
              <h1 className="text-2xl font-bold gradient-text">File Storage</h1>
              <p className="text-sm text-muted-foreground">
                Manage documents, photos, and reports
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Upload Dialog */}
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent">
                <Plus className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload File</DialogTitle>
                <DialogDescription>
                  Upload documents, photos, or reports to the file storage system.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Select File</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum file size: 10MB
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Add a description for this file..."
                    rows={3}
                  />
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-sm text-center text-muted-foreground">
                      Uploading file...
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>File Management</CardTitle>
              <CardDescription>
                Search and filter your stored files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Search files by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {FILE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Files Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFiles.map((file) => (
              <Card key={file.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm truncate">{file.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {formatFileSize(file.size)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {file.category.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {file.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {file.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = file.url;
                          a.download = file.name;
                          a.click();
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileDelete(file.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(file.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredFiles.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No files found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || selectedCategory 
                    ? "No files match your current filters" 
                    : "Upload your first file to get started"
                  }
                </p>
                {!searchTerm && !selectedCategory && (
                  <Button onClick={() => setIsUploadDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
