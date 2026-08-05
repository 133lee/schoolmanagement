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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";

// Form validation schema
const addMemberSchema = z.object({
  teacherIds: z.array(z.string()).min(1, "Please select at least one teacher"),
});

type AddMemberFormValues = z.infer<typeof addMemberSchema>;

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AddMemberFormValues) => Promise<void>;
  isSubmitting?: boolean;
  departmentId: string;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  departmentId,
}: AddMemberDialogProps) {
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      teacherIds: [],
    },
  });

  // Fetch available teachers (those without a department or in a different department)
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const params = new URLSearchParams();
        if (teacherSearch) params.append("search", teacherSearch);
        params.append("page", "1");
        params.append("pageSize", "50");

        const response = await fetch(`/api/teachers?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();
        if (result.success) {
          // Filter out teachers already in this department
          const availableTeachers = result.data.filter(
            (teacher: any) => teacher.departmentId !== departmentId
          );
          setTeachers(availableTeachers);
        }
      } catch (error) {
        console.error("Failed to fetch teachers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchTeachers();
    }
  }, [open, teacherSearch, departmentId]);

  const handleFormSubmit = async (data: AddMemberFormValues) => {
    await onSubmit(data);
    form.reset();
    setTeacherSearch("");
  };

  const handleCancel = () => {
    form.reset();
    setTeacherSearch("");
    onOpenChange(false);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Members to Department</DialogTitle>
          <DialogDescription>
            Select teachers to add to this department
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Teacher Selection */}
            <FormField
              control={form.control}
              name="teacherIds"
              render={() => (
                <FormItem className="w-full">
                  <FormLabel>Teachers</FormLabel>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search teachers..."
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="border rounded-md">
                      <ScrollArea className="h-[300px]">
                        {isLoading ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Loading teachers...
                          </div>
                        ) : teachers.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            {teacherSearch
                              ? "No teachers found"
                              : "No available teachers"}
                          </div>
                        ) : (
                          <div className="p-1">
                            {teachers.map((teacher: any) => (
                              <FormField
                                key={teacher.id}
                                control={form.control}
                                name="teacherIds"
                                render={({ field }) => {
                                  const handleToggle = () => {
                                    const currentValue = field.value || [];
                                    const isChecked = currentValue.includes(teacher.id);

                                    if (isChecked) {
                                      field.onChange(
                                        currentValue.filter((value) => value !== teacher.id)
                                      );
                                    } else {
                                      field.onChange([...currentValue, teacher.id]);
                                    }
                                  };

                                  return (
                                    <FormItem
                                      key={teacher.id}
                                      className="flex flex-row items-center space-x-3 space-y-0 rounded-sm px-3 py-2 hover:bg-accent cursor-pointer"
                                      onClick={handleToggle}
                                    >
                                      <FormControl>
                                        <div onClick={(e) => e.stopPropagation()}>
                                          <Checkbox
                                            checked={field.value?.includes(teacher.id)}
                                            onCheckedChange={(checked) => {
                                              const currentValue = field.value || [];
                                              return checked
                                                ? field.onChange([...currentValue, teacher.id])
                                                : field.onChange(
                                                    currentValue.filter(
                                                      (value) => value !== teacher.id
                                                    )
                                                  );
                                            }}
                                          />
                                        </div>
                                      </FormControl>
                                      <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                          {getInitials(teacher.firstName, teacher.lastName)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">
                                          {teacher.firstName} {teacher.lastName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {teacher.staffNumber}
                                        </p>
                                      </div>
                                      <Badge variant="outline" className="text-xs shrink-0">
                                        {teacher.qualification}
                                      </Badge>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                  <FormDescription>
                    Select one or more teachers to add
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
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
                {isSubmitting ? "Adding..." : `Add ${form.watch("teacherIds")?.length || 0} Member(s)`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
