"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DepartmentStatus } from "@/types/prisma-enums";

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
import { useDepartments } from "@/hooks/useDepartments";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Form validation schema
const editDepartmentSchema = z.object({
  name: z.string().min(2, "Department name must be at least 2 characters"),
  code: z
    .string()
    .min(2, "Department code must be at least 2 characters")
    .max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  status: z.nativeEnum(DepartmentStatus),
  hodTeacherId: z.string().optional(),
});

type EditDepartmentFormValues = z.infer<typeof editDepartmentSchema>;

interface EditDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId?: string;
  onSuccess?: () => void;
}

export function EditDepartmentDialog({
  open,
  onOpenChange,
  departmentId,
  onSuccess,
}: EditDepartmentDialogProps) {
  const { toast } = useToast();
  const { getDepartment, updateDepartment } = useDepartments();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hodOptions, setHodOptions] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const form = useForm<EditDepartmentFormValues>({
    resolver: zodResolver(editDepartmentSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      status: DepartmentStatus.ACTIVE,
      hodTeacherId: "",
    },
  });

  // Load department data and HOD options when dialog opens
  useEffect(() => {
    if (!open) return;
    if (!departmentId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch department data
        const data = await getDepartment(departmentId, false);

        // Fetch teacher options (all active teachers who can be HOD)
        const token = localStorage.getItem("auth_token");
        const teachersResponse = await fetch("/api/teachers?status=ACTIVE", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (teachersResponse.ok) {
          const teachersData = await teachersResponse.json();
          console.log("Teachers API Response:", teachersData);
          const teachers = teachersData.data.map((teacher: any) => ({
            id: teacher.id,
            name: `${teacher.firstName} ${teacher.lastName}`,
            email: teacher.user?.email || teacher.email || "",
          }));
          console.log("Transformed teacher options:", teachers);
          setHodOptions(teachers);
        } else {
          console.error("Failed to fetch teachers:", teachersResponse.status, await teachersResponse.text());
        }

        form.reset({
          name: data.name,
          code: data.code,
          description: data.description || "",
          status: data.status,
          hodTeacherId: data.hodTeacherId || "",
        });
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load department data",
          variant: "destructive",
        });
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, departmentId]);

  const handleSubmit = async (data: EditDepartmentFormValues) => {
    if (!departmentId) return;

    try {
      setIsSubmitting(true);

      // Format data for API.
      // hodTeacherId must be sent as an explicit `null` (not omitted) when
      // clearing the HOD — the backend only touches hodTeacher when the key
      // is present, and `undefined` values are dropped entirely by
      // JSON.stringify, so omitting it here would silently leave the
      // previous HOD in place.
      const formattedData = {
        name: data.name,
        code: data.code,
        description: data.description || undefined,
        status: data.status,
        hodTeacherId: data.hodTeacherId || null,
      };

      await updateDepartment(departmentId, formattedData);

      toast({
        title: "Success",
        description: "Department updated successfully",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update department",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>
            Update department information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading department data...</p>
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
                      <FormLabel>Department Name</FormLabel>
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
                      <FormLabel>Department Code</FormLabel>
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={DepartmentStatus.ACTIVE}>Active</SelectItem>
                          <SelectItem value={DepartmentStatus.INACTIVE}>Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hodTeacherId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Head of Department{" "}
                        <span className="text-muted-foreground">(Optional)</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "none" ? "" : value)
                        }
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select HOD" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {hodOptions.map((hod) => (
                            <SelectItem key={hod.id} value={hod.id}>
                              {hod.name}
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
                          placeholder="Department description..."
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
                  {isSubmitting ? "Updating..." : "Update Department"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
