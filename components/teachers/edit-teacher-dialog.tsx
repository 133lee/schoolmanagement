"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Gender, StaffStatus, QualificationLevel } from "@/types/prisma-enums";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeachers } from "@/hooks/useTeachers";
import { useSubjects } from "@/hooks/useSubjects";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Form validation schema (simpler than the full create form)
const editTeacherSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  middleName: z.string().optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  gender: z.nativeEnum(Gender, { message: "Please select a gender" }),
  dateOfBirth: z.date({ message: "Date of birth is required" }),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  qualification: z.nativeEnum(QualificationLevel, {
    message: "Please select qualification level",
  }),
  yearsExperience: z.number().min(0).optional(),
  address: z.string().optional(),
  primarySubjectId: z.string().min(1, "Please select a primary subject"),
  secondarySubjectId: z.string().optional(),
});

type EditTeacherFormValues = z.infer<typeof editTeacherSchema>;

interface EditTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId?: string;
  onSuccess?: () => void;
}

export function EditTeacherDialog({
  open,
  onOpenChange,
  teacherId,
  onSuccess,
}: EditTeacherDialogProps) {
  const { toast } = useToast();
  const { getTeacher, updateTeacher } = useTeachers();
  const { subjects, isLoading: loadingSubjects } = useSubjects({ mode: "all" }, { page: 1, pageSize: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditTeacherFormValues>({
    resolver: zodResolver(editTeacherSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      gender: undefined,
      dateOfBirth: undefined,
      phone: "",
      qualification: undefined,
      yearsExperience: 0,
      address: "",
      primarySubjectId: "",
      secondarySubjectId: "",
    },
  });

  // Load teacher data when dialog opens
  useEffect(() => {
    if (!open) return;
    if (!teacherId) return;

    const fetchTeacher = async () => {
      try {
        setIsLoading(true);
        const data = await getTeacher(teacherId, false);

        // Get teacher subjects (if available)
        const primarySubject = "";
        const secondarySubject = "";

        form.reset({
          firstName: data.firstName,
          middleName: data.middleName || "",
          lastName: data.lastName,
          gender: data.gender,
          dateOfBirth: new Date(data.dateOfBirth),
          phone: data.phone,
          qualification: data.qualification,
          yearsExperience: data.yearsExperience || 0,
          address: data.address || "",
          primarySubjectId: primarySubject,
          secondarySubjectId: secondarySubject,
        });
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load teacher data",
          variant: "destructive",
        });
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeacher();
  }, [open, teacherId]);

  const handleSubmit = async (data: EditTeacherFormValues) => {
    if (!teacherId) return;

    try {
      setIsSubmitting(true);

      // Format data for API
      const formattedData = {
        firstName: data.firstName,
        middleName: data.middleName || undefined,
        lastName: data.lastName,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth.toISOString(),
        phone: data.phone,
        qualification: data.qualification,
        yearsExperience: data.yearsExperience,
        address: data.address || undefined,
        primarySubjectId: data.primarySubjectId,
        secondarySubjectId: data.secondarySubjectId || undefined,
      };

      await updateTeacher(teacherId, formattedData);

      toast({
        title: "Success",
        description: "Teacher updated successfully",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update teacher",
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Teacher</DialogTitle>
          <DialogDescription>
            Update teacher information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading teacher data...</p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Middle Name <span className="text-muted-foreground">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={Gender.MALE}>Male</SelectItem>
                          <SelectItem value={Gender.FEMALE}>Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={
                            field.value
                              ? field.value.toISOString().split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? new Date(e.target.value)
                                : undefined
                            )
                          }
                          max={new Date().toISOString().split("T")[0]}
                          min="1940-01-01"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+260..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualification Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select qualification" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={QualificationLevel.CERTIFICATE}>Certificate</SelectItem>
                          <SelectItem value={QualificationLevel.DIPLOMA}>Diploma</SelectItem>
                          <SelectItem value={QualificationLevel.DEGREE}>Degree</SelectItem>
                          <SelectItem value={QualificationLevel.MASTERS}>Masters</SelectItem>
                          <SelectItem value={QualificationLevel.DOCTORATE}>Doctorate</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearsExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Years of Experience <span className="text-muted-foreground">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>
                        Address <span className="text-muted-foreground">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street, City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primarySubjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Subject</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingSubjects}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select primary subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name} ({subject.code})
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
                  name="secondarySubjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Secondary Subject <span className="text-muted-foreground">(Optional)</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "NONE" ? "" : value)}
                        value={field.value || "NONE"}
                        disabled={loadingSubjects}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select secondary subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          {subjects
                            .filter((subject) => subject.id !== form.watch("primarySubjectId"))
                            .map((subject) => (
                              <SelectItem key={subject.id} value={subject.id}>
                                {subject.name} ({subject.code})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
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
                  {isSubmitting ? "Updating..." : "Update Teacher"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
