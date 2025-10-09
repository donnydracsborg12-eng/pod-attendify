import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
}

interface StudentManagementTableProps {
  students: Student[];
  onStudentUpdate: (student: Student) => void;
  onStudentDelete: (studentId: string) => void;
  onStudentCreate: (student: Omit<Student, 'id'>) => void;
}

export function StudentManagementTable({
  students,
  onStudentUpdate,
  onStudentDelete,
  onStudentCreate,
}: StudentManagementTableProps) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Student>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setEditData(student);
  };

  const handleSave = () => {
    if (editingId && editData.student_number && editData.first_name && editData.last_name) {
      onStudentUpdate(editData as Student);
      setEditingId(null);
      setEditData({});
      toast({
        title: "Success",
        description: "Student updated successfully",
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleCreate = () => {
    if (newStudent.student_number && newStudent.first_name && newStudent.last_name) {
      onStudentCreate(newStudent as Omit<Student, 'id'>);
      setIsCreating(false);
      setNewStudent({});
      toast({
        title: "Success",
        description: "Student created successfully",
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      onStudentDelete(deleteId);
      setDeleteId(null);
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>
                Create, edit, or delete student records
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreating(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Number</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Middle Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isCreating && (
                  <TableRow className="bg-blue-500/5">
                    <TableCell>
                      <Input
                        placeholder="Student Number"
                        value={newStudent.student_number || ''}
                        onChange={(e) => setNewStudent({ ...newStudent, student_number: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="First Name"
                        value={newStudent.first_name || ''}
                        onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Last Name"
                        value={newStudent.last_name || ''}
                        onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Middle Name"
                        value={newStudent.middle_name || ''}
                        onChange={(e) => setNewStudent({ ...newStudent, middle_name: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={handleCreate}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setIsCreating(false);
                            setNewStudent({});
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {students.map((student) => (
                  <TableRow key={student.id}>
                    {editingId === student.id ? (
                      <>
                        <TableCell>
                          <Input
                            value={editData.student_number || ''}
                            onChange={(e) => setEditData({ ...editData, student_number: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editData.first_name || ''}
                            onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editData.last_name || ''}
                            onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editData.middle_name || ''}
                            onChange={(e) => setEditData({ ...editData, middle_name: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={handleSave}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancel}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{student.student_number}</TableCell>
                        <TableCell>{student.first_name}</TableCell>
                        <TableCell>{student.last_name}</TableCell>
                        <TableCell>{student.middle_name || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(student)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteId(student.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the student record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
