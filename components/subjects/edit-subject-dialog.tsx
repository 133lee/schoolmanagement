"use client";

import { useState, useEffect } from "react";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubjects } from "@/hooks/useSubjects";
import { useDepartments } from "@/hooks/useDepartments";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { DepartmentChangeWarningDialog } from "./department-change-warning-dialog";
import { SUBJECT_VALIDATION_MODE } from "@/config/subject-validation.config";

// Form validation schema
const editSubjectSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters"),
  code: z
    .string()
    .min(2, "Subject code must be at least 2 characters")
    .max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  departmentId: z.string().optional(),
});

type EditSubjectFormValues = z.infer<typeof editSubjectSchema>;

interface EditSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId?: string;
  onSuccess?: () => void;
}

export function EditSubjectDialog({
  open,
  onOpenChange,
  subjectId,
  onSuccess,
}: EditSubjectDialogProps) {
  const { toast } = useToast();
  const { getSubject, updateSubject } = useSubjects();
  const { departments } = useDepartments({}, { page: 1, pageSize: 100 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalDepartmentId, setOriginalDepartmentId] = useState<string | null>(null);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [subjectUsage, setSubjectUsage] = useState<any>(null);
  const [pendingData, setPendingData] = useState<EditSubjectFormValues | null>(null);

  const form = useForm<EditSubjectFormValues>({
    resolver: zodResolver(editSubjectSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      departmentId: "",
    },
  });

  // Load subject data when dialog opens
  useEffect(() => {
    if (!open) return;
    if (!subjectId) return;

    const fetchSubject = async () => {
      try {
        setIsLoading(true);
        const data = await getSubject(subjectId, false);

        form.reset({
          name: data.name,
          code: data.code,
          description: data.description || "",
          departmentId: data.departmentId || "",
        });

        // Store original department ID for comparison
        setOriginalDepartmentId(data.departmentId || null);
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load subject data",
          variant: "destructive",
        });
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubject();
  }, [open, subjectId]);

  const handleSubmit = async (data: EditSubjectFormValues) => {
    if (!subjectId) return;

    // Check if department is changing and we're in warning mode
    const newDeptId = data.departmentId || null;
    const isDepartmentChanging = newDeptId !== originalDepartmentId;

    if (
      SUBJECT_VALIDATION_MODE === "APPROACH_B_WARNING" &&
      isDepartmentChanging
    ) {
      // Check if subject is in use
      try {
        setIsSubmitting(true);
        const token = localStorage.getItem("auth_token");

        const response = await fetch(`/api/subjects/${subjectId}/usage`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to check subject usage");
        }

        const usage = await response.json();

        if (usage.isInUse) {
          // Show warning dialog
          setPendingData(data);
          setSubjectUsage(usage);
          setWarningDialogOpen(true);
          setIsSubmitting(false);
          return; // Don't proceed with update yet
        }
      } catch (error) {
        console.error("Error checking usage:", error);
        // If usage check fails, proceed anyway (fallback to permissive)
      } finally {
        setIsSubmitting(false);
      }
    }

    // Proceed with update
    await performUpdate(data);
  };

  const performUpdate = async (data: EditSubjectFormValues) => {
    if (!subjectId) return;

    try {
      setIsSubmitting(true);

      // Format data for API
      const formattedData = {
        name: data.name,
        code: data.code,
        description: data.description || undefined,
        departmentId: data.departmentId || undefined,
      };

      await updateSubject(subjectId, formattedData);

      toast({
        title: "Success",
        description: "Subject updated successfully",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update subject",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWarningConfirm = async () => {
    setWarningDialogOpen(false);
    if (pendingData) {
      await performUpdate(pendingData);
      setPendingData(null);
    }
  };

  const handleWarningCancel = () => {
    setWarningDialogOpen(false);
    setPendingData(null);
    setSubjectUsage(null);
  };

  const getDepartmentChangeSummary = () => {
    if (!subjectUsage || !departments.length) return "";

    const oldDept = departments.find((d: any) => d.id === originalDepartmentId);
    const newDept = departments.find((d: any) => d.id === pendingData?.departmentId);

    if (oldDept && newDept) {
      return `Changing from "${oldDept.name}" to "${newDept.name}"`;
    } else if (oldDept && !newDept) {
      return `Removing department assignment from "${oldDept.name}"`;
    } else if (!oldDept && newDept) {
      return `Assigning to "${newDept.name}"`;
    }

    return "Changing department assignment";
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
          <DialogDescription>
            Update subject information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading subject data...</p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Mathematics" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="MATH"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Department{" "}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                        value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {departments.map((department: any) => (
                            <SelectItem
                              key={department.id}
                              value={department.id}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Description <span className="text-muted-foreground">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Subject description..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Subject"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>

      {/* Warning Dialog for Approach B */}
      <DepartmentChangeWarningDialog
        open={warningDialogOpen}
        onOpenChange={setWarningDialogOpen}
        usage={subjectUsage}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
        changeSummary={getDepartmentChangeSummary()}
      />
    </>
  );
}
