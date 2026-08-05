"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReportCards } from "@/hooks/useReportCards";
import { useClasses } from "@/hooks/useClasses";
import { useTerms } from "@/hooks/useTerms";
import { useTeachers } from "@/hooks/useTeachers";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Form validation schema
const bulkGenerateSchema = z.object({
  classId: z.string().min(1, "Please select a class"),
  termId: z.string().min(1, "Please select a term"),
  classTeacherId: z.string().min(1, "Please select a class teacher"),
});

type BulkGenerateFormValues = z.infer<typeof bulkGenerateSchema>;

interface BulkGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkGenerateDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkGenerateDialogProps) {
  const { toast } = useToast();
  const { bulkGenerateReportCards } = useReportCards();
  const { classes, isLoading: classesLoading } = useClasses({ mode: "all" }, { page: 1, pageSize: 10 });
  const { terms, isLoading: termsLoading } = useTerms();
  const { teachers, isLoading: teachersLoading } = useTeachers({ mode: "all" }, { page: 1, pageSize: 10 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ successful: number; failed: Array<{ studentId: string; error: string }> } | null>(null);

  const form = useForm<BulkGenerateFormValues>({
    resolver: zodResolver(bulkGenerateSchema),
    defaultValues: {
      classId: "",
      termId: "",
      classTeacherId: "",
    },
  });

  // Watch the classId field to filter teachers
  const selectedClassId = form.watch("classId");

  // Filter teachers based on selected class
  const filteredTeachers = useMemo(() => {
    if (!selectedClassId) return teachers;

    const selectedClass = classes.find(c => c.id === selectedClassId) as any;
    if (!selectedClass || !selectedClass.classTeacherAssignments || selectedClass.classTeacherAssignments.length === 0) {
      return teachers; // If no class teacher assigned, show all teachers
    }

    // Return only the assigned class teacher(s)
    const assignedTeacherIds = selectedClass.classTeacherAssignments.map((assignment: any) => assignment.teacherId);
    return teachers.filter(teacher => assignedTeacherIds.includes(teacher.id));
  }, [selectedClassId, classes, teachers]);

  const handleSubmit = async (data: BulkGenerateFormValues) => {
    try {
      setIsSubmitting(true);
      setResult(null);

      const response = await bulkGenerateReportCards({
        classId: data.classId,
        termId: data.termId,
        classTeacherId: data.classTeacherId,
      });

      setResult(response);

      if (response.failed.length === 0) {
        toast({
          title: "Success",
          description: `Generated ${response.successful} report cards successfully`,
        });
        onOpenChange(false);
        form.reset();
        onSuccess?.();
      } else {
        toast({
          title: "Partially Completed",
          description: `Generated ${response.successful} report cards. ${response.failed.length} failed.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate report cards",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Generate Report Cards</DialogTitle>
          <DialogDescription>
            Generate report cards for all students in a class for a specific term
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <Select
                    disabled={isSubmitting || classesLoading}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset class teacher when class changes
                      form.setValue("classTeacherId", "");
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.name} ({(classItem as any).grade?.name || "Unknown Grade"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the class to generate report cards for
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="termId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Term</FormLabel>
                  <Select
                    disabled={isSubmitting || termsLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a term" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {terms.map((term) => (
                        <SelectItem key={term.id} value={term.id}>
                          {term.termType} - {(term as any).academicYear?.year || "Unknown Year"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the term for which to generate report cards
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="classTeacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Teacher</FormLabel>
                  <Select
                    disabled={isSubmitting || teachersLoading || !selectedClassId}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedClassId ? "Select a class teacher" : "Select a class first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredTeachers.length > 0 ? (
                        filteredTeachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.firstName} {teacher.middleName ? teacher.middleName + " " : ""}{teacher.lastName}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-teacher" disabled>
                          No class teacher assigned
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {selectedClassId
                      ? filteredTeachers.length > 0
                        ? "Class teacher assigned to the selected class"
                        : "No class teacher assigned to this class. Please assign one first."
                      : "Select a class to view its assigned class teacher"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {result && result.failed.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">Some report cards failed to generate:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {result.failed.slice(0, 5).map((failure, index) => (
                        <li key={index}>
                          Student ID: {failure.studentId} - {failure.error}
                        </li>
                      ))}
                      {result.failed.length > 5 && (
                        <li>... and {result.failed.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Report Cards
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
