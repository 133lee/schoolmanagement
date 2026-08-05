"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Gender, StudentStatus, VulnerabilityStatus, OrphanType, DeceasedParent } from "@/types/prisma-enums";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useStudents } from "@/hooks/useStudents";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Form validation schema (simpler than the full create form)
const editStudentSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  middleName: z.string().optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  gender: z.nativeEnum(Gender, { message: "Please select a gender" }),
  dateOfBirth: z.date({ message: "Date of birth is required" }),
  status: z.nativeEnum(StudentStatus, { message: "Please select a status" }),
  statusChangeReason: z.string().optional(),
  vulnerability: z.nativeEnum(VulnerabilityStatus, { message: "Please select vulnerability status" }),
  orphanType: z.nativeEnum(OrphanType).optional(),
  deceasedParent: z.nativeEnum(DeceasedParent).optional(),
  address: z.string().optional(),
  medicalInfo: z.string().optional(),
}).refine((data) => {
  // Require statusChangeReason when status is TRANSFERRED or SUSPENDED
  if (data.status === StudentStatus.TRANSFERRED || data.status === StudentStatus.SUSPENDED) {
    return !!data.statusChangeReason && data.statusChangeReason.trim().length >= 10;
  }
  return true;
}, {
  message: "Please provide a reason (minimum 10 characters) for this status change",
  path: ["statusChangeReason"],
}).refine((data) => {
  // Require orphanType when vulnerability is ORPHAN
  if (data.vulnerability === VulnerabilityStatus.ORPHAN) {
    return !!data.orphanType;
  }
  return true;
}, {
  message: "Please specify the orphan type",
  path: ["orphanType"],
}).refine((data) => {
  // Require deceasedParent when orphanType is SINGLE_ORPHAN
  if (data.vulnerability === VulnerabilityStatus.ORPHAN && data.orphanType === OrphanType.SINGLE_ORPHAN) {
    return !!data.deceasedParent;
  }
  return true;
}, {
  message: "Please specify which parent is deceased",
  path: ["deceasedParent"],
});

type EditStudentFormValues = z.infer<typeof editStudentSchema>;

interface EditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: string;
  onSuccess?: () => void;
}

export function EditStudentDialog({
  open,
  onOpenChange,
  studentId,
  onSuccess,
}: EditStudentDialogProps) {
  const { toast } = useToast();
  const { getStudent, updateStudent } = useStudents();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditStudentFormValues>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      gender: undefined,
      dateOfBirth: undefined,
      status: StudentStatus.ACTIVE,
      statusChangeReason: "",
      vulnerability: VulnerabilityStatus.NOT_VULNERABLE,
      orphanType: undefined,
      deceasedParent: undefined,
      address: "",
      medicalInfo: "",
    },
  });

  // Load student data when dialog opens
  useEffect(() => {
    if (!open) return;
    if (!studentId) return;

    const fetchStudent = async () => {
      try {
        setIsLoading(true);
        const data = await getStudent(studentId, false);

        form.reset({
          firstName: data.firstName,
          middleName: data.middleName || "",
          lastName: data.lastName,
          gender: data.gender,
          dateOfBirth: new Date(data.dateOfBirth),
          status: data.status,
          vulnerability: data.vulnerability || VulnerabilityStatus.NOT_VULNERABLE,
          orphanType: data.orphanType || undefined,
          deceasedParent: data.deceasedParent || undefined,
          address: data.address || "",
          medicalInfo: data.medicalInfo || "",
        });
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load student data",
          variant: "destructive",
        });
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudent();
  }, [open, studentId]);

  // Clear orphan fields when vulnerability status changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "vulnerability" && value.vulnerability !== VulnerabilityStatus.ORPHAN) {
        form.setValue("orphanType", undefined);
        form.setValue("deceasedParent", undefined);
      }
      if (name === "orphanType" && value.orphanType !== OrphanType.SINGLE_ORPHAN) {
        form.setValue("deceasedParent", undefined);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleSubmit = async (data: EditStudentFormValues) => {
    if (!studentId) return;

    try {
      setIsSubmitting(true);

      // Format data for API
      const formattedData = {
        firstName: data.firstName,
        middleName: data.middleName || undefined,
        lastName: data.lastName,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth.toISOString(),
        status: data.status,
        statusChangeReason: data.statusChangeReason || undefined,
        vulnerability: data.vulnerability,
        orphanType: data.orphanType || undefined,
        deceasedParent: data.deceasedParent || undefined,
        address: data.address || undefined,
        medicalInfo: data.medicalInfo || undefined,
      };

      await updateStudent(studentId, formattedData);

      toast({
        title: "Success",
        description: "Student updated successfully",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update student",
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
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update student information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading student data...</p>
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
                          min="1900-01-01"
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
                          <SelectItem value={StudentStatus.ACTIVE}>Active</SelectItem>
                          <SelectItem value={StudentStatus.SUSPENDED}>Suspended</SelectItem>
                          <SelectItem value={StudentStatus.GRADUATED}>Graduated</SelectItem>
                          <SelectItem value={StudentStatus.WITHDRAWN}>Withdrawn</SelectItem>
                          <SelectItem value={StudentStatus.TRANSFERRED}>Transferred</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conditional reason field for TRANSFERRED or SUSPENDED */}
                {(form.watch("status") === StudentStatus.TRANSFERRED ||
                  form.watch("status") === StudentStatus.SUSPENDED) && (
                  <FormField
                    control={form.control}
                    name="statusChangeReason"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>
                          Reason for {form.watch("status") === StudentStatus.TRANSFERRED ? "Transfer" : "Suspension"} <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Please provide a detailed reason for this status change (minimum 10 characters)..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This reason will be recorded for accountability and future reference.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="vulnerability"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Vulnerability Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vulnerability status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={VulnerabilityStatus.NOT_VULNERABLE}>Not Vulnerable</SelectItem>
                          <SelectItem value={VulnerabilityStatus.ORPHAN}>Orphan</SelectItem>
                          <SelectItem value={VulnerabilityStatus.VULNERABLE_CHILD}>Vulnerable Child</SelectItem>
                          <SelectItem value={VulnerabilityStatus.SPECIAL_NEEDS}>Special Needs</SelectItem>
                          <SelectItem value={VulnerabilityStatus.UNDER_FIVE_INITIATIVE}>Under Five Initiative</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conditional orphan classification when vulnerability is ORPHAN */}
                {form.watch("vulnerability") === VulnerabilityStatus.ORPHAN && (
                  <>
                    <FormField
                      control={form.control}
                      name="orphanType"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2 space-y-3">
                          <FormLabel>
                            Orphan Classification <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value={OrphanType.SINGLE_ORPHAN} id="single-orphan" />
                                <Label htmlFor="single-orphan" className="font-normal cursor-pointer">
                                  Single Orphan (One parent deceased)
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value={OrphanType.DOUBLE_ORPHAN} id="double-orphan" />
                                <Label htmlFor="double-orphan" className="font-normal cursor-pointer">
                                  Double Orphan (Both parents deceased)
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormDescription>
                            Please select the appropriate orphan classification for this student.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Conditional deceased parent field when orphanType is SINGLE_ORPHAN */}
                    {form.watch("orphanType") === OrphanType.SINGLE_ORPHAN && (
                      <FormField
                        control={form.control}
                        name="deceasedParent"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>
                              Deceased Parent <span className="text-destructive">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select which parent is deceased" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={DeceasedParent.FATHER}>Father</SelectItem>
                                <SelectItem value={DeceasedParent.MOTHER}>Mother</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Please specify which parent is deceased.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}

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
                  name="medicalInfo"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>
                        Medical Information <span className="text-muted-foreground">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Allergies, conditions, etc." {...field} />
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
                  {isSubmitting ? "Updating..." : "Update Student"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
