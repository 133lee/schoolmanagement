"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Gender, StaffStatus, QualificationLevel } from "@/types/prisma-enums";
import { useSubjects } from "@/hooks/useSubjects";
import { format } from "date-fns";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Form validation schema
const teacherFormSchema = z.object({
  // Step 1: Personal Information
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name too long"),
  middleName: z.string().max(50, "Middle name too long").optional(),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name too long"),
  gender: z.nativeEnum(Gender, { message: "Please select a gender" }),
  dateOfBirth: z.date({ message: "Date of birth is required" }),
  phone: z
    .string()
    .regex(
      /^\+260\d{9}$/,
      "Phone number must be in format +260XXXXXXXXX (Zambian mobile)"
    ),

  // Step 2: Employment Information
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  staffNumber: z
    .string()
    .regex(
      /^STAFF\d{4}\d{3}$/,
      "Staff number must be in format STAFFYYYYXXX (e.g., STAFF2024001)"
    ),
  hireDate: z.date({ message: "Hire date is required" }),
  status: z.nativeEnum(StaffStatus),

  // Step 3: Qualification & Experience
  qualification: z.nativeEnum(QualificationLevel, {
    message: "Please select qualification level",
  }),
  yearsExperience: z
    .number()
    .min(0, "Years of experience cannot be negative")
    .max(50, "Invalid years")
    .optional(),
  address: z.string().max(200, "Address too long").optional(),

  // Step 4: Subject Specializations
  primarySubjectId: z.string().min(1, "Please select a primary subject"),
  secondarySubjectId: z.string().optional(),
  permissibleSubjectId1: z.string().optional(),
  permissibleSubjectId2: z.string().optional(),
});

type TeacherFormValues = z.infer<typeof teacherFormSchema>;

type TeacherFormSubmitValues = Omit<
  TeacherFormValues,
  "permissibleSubjectId1" | "permissibleSubjectId2"
> & { permissibleSubjectIds: string[] };

interface TeacherFormProps {
  onSubmit: (data: TeacherFormSubmitValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: Partial<TeacherFormValues>;
}

const STEPS = [
  { id: 1, name: "Personal Info", description: "Basic information" },
  { id: 2, name: "Employment", description: "Job details" },
  { id: 3, name: "Qualification", description: "Education & experience" },
  { id: 4, name: "Subjects", description: "Subject specializations" },
  { id: 5, name: "Review", description: "Confirm information" },
];

export function TeacherForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData,
}: TeacherFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);

  // Fetch all subjects for subject selection
  const { subjects, isLoading: loadingSubjects } = useSubjects(
    { mode: "all" },
    { page: 1, pageSize: 10 } // Not used when mode=all, but required by the hook
  );

  // Generate staff number on mount
  const generateStaffNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `STAFF${year}${random}`;
  };

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      middleName: initialData?.middleName || "",
      lastName: initialData?.lastName || "",
      gender: initialData?.gender || undefined,
      dateOfBirth: initialData?.dateOfBirth || undefined,
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      staffNumber: initialData?.staffNumber || generateStaffNumber(),
      hireDate: initialData?.hireDate || new Date(),
      status: initialData?.status || StaffStatus.ACTIVE,
      qualification: initialData?.qualification || undefined,
      yearsExperience: initialData?.yearsExperience || 0,
      address: initialData?.address || "",
      primarySubjectId: initialData?.primarySubjectId || "",
      secondarySubjectId: initialData?.secondarySubjectId || "",
      permissibleSubjectId1: initialData?.permissibleSubjectId1 || "",
      permissibleSubjectId2: initialData?.permissibleSubjectId2 || "",
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof TeacherFormValues)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = [
          "firstName",
          "middleName",
          "lastName",
          "gender",
          "dateOfBirth",
          "phone",
        ];
        break;
      case 2:
        fieldsToValidate = ["email", "staffNumber", "hireDate", "status"];
        break;
      case 3:
        fieldsToValidate = ["qualification", "yearsExperience", "address"];
        break;
      case 4:
        fieldsToValidate = [
          "primarySubjectId",
          "secondarySubjectId",
          "permissibleSubjectId1",
          "permissibleSubjectId2",
        ];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    // Reset confirmation if going back from review step
    if (currentStep === 5) {
      setIsReviewConfirmed(false);
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFormSubmit = async (data: TeacherFormValues) => {
    const { permissibleSubjectId1, permissibleSubjectId2, ...rest } = data;
    const permissibleSubjectIds = [permissibleSubjectId1, permissibleSubjectId2].filter(
      (id): id is string => Boolean(id)
    );
    await onSubmit({ ...rest, permissibleSubjectIds });
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Tracker */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center relative flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 font-semibold text-sm transition-colors z-10 bg-background",
                    currentStep > step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "border-primary text-primary"
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}>
                  {currentStep > step.id ? "✓" : step.id}
                </div>
                <div className="text-center mt-2">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      currentStep >= step.id
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}>
                    {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 -mt-12 transition-colors",
                    currentStep > step.id
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted-foreground/20 rounded-full h-1">
          <div
            className="bg-primary h-1 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-6">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the teacher's basic personal details
                </p>
              </div>

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
                        Middle Name{" "}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}>
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
                      <FormDescription className="invisible">
                        Placeholder
                      </FormDescription>
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
                      <FormDescription>
                        Teacher must be at least 18 years old
                      </FormDescription>
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
                        <Input placeholder="+260 XXX XXX XXX" {...field} />
                      </FormControl>
                      <FormDescription>Primary contact number</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Step 2: Employment Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Employment Information
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enter employment and system details
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="staffNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="STAFF2024001"
                          {...field}
                          disabled
                          className="bg-muted cursor-not-allowed"
                        />
                      </FormControl>
                      <FormDescription>
                        Auto-generated unique identifier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={StaffStatus.ACTIVE}>
                            Active
                          </SelectItem>
                          <SelectItem value={StaffStatus.ON_LEAVE}>
                            On Leave
                          </SelectItem>
                          <SelectItem value={StaffStatus.SUSPENDED}>
                            Suspended
                          </SelectItem>
                          <SelectItem value={StaffStatus.TERMINATED}>
                            Terminated
                          </SelectItem>
                          <SelectItem value={StaffStatus.RETIRED}>
                            Retired
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="invisible">
                        Placeholder
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="teacher@school.gov.zm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Teacher's email (used for login with default password:
                        teacher123)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hire Date</FormLabel>
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
                          min="1990-01-01"
                        />
                      </FormControl>
                      <FormDescription>
                        Date the teacher was hired
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Step 3: Qualification & Experience */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Qualification & Experience
                </h3>
                <p className="text-sm text-muted-foreground">
                  Education and professional background
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualification Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select qualification" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={QualificationLevel.CERTIFICATE}>
                            Certificate
                          </SelectItem>
                          <SelectItem value={QualificationLevel.DIPLOMA}>
                            Diploma
                          </SelectItem>
                          <SelectItem value={QualificationLevel.DEGREE}>
                            Degree
                          </SelectItem>
                          <SelectItem value={QualificationLevel.MASTERS}>
                            Masters
                          </SelectItem>
                          <SelectItem value={QualificationLevel.DOCTORATE}>
                            Doctorate
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Highest educational qualification
                      </FormDescription>
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
                        Years of Experience{" "}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Total years of teaching experience
                      </FormDescription>
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
                        Address{" "}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street, City" {...field} />
                      </FormControl>
                      <FormDescription>Residential address</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Step 4: Subject Specializations */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Subject Specializations
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select the primary and, optionally, a secondary subject this
                  teacher specializes in
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primarySubjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Subject</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Permissible subjects are scoped to the primary
                          // and secondary subjects' departments, so a
                          // primary-subject change can invalidate prior
                          // permissible-subject picks.
                          form.setValue("permissibleSubjectId1", "");
                          form.setValue("permissibleSubjectId2", "");
                        }}
                        defaultValue={field.value}
                        disabled={loadingSubjects}>
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
                      <FormDescription>
                        Main subject this teacher specializes in
                      </FormDescription>
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
                        Secondary Subject{" "}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value === "NONE" ? "" : value);
                          // Same reasoning as the primary subject above.
                          form.setValue("permissibleSubjectId1", "");
                          form.setValue("permissibleSubjectId2", "");
                        }}
                        value={field.value || "NONE"}
                        disabled={loadingSubjects}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select secondary subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          {subjects
                            .filter(
                              (subject) =>
                                subject.id !== form.watch("primarySubjectId")
                            )
                            .map((subject) => (
                              <SelectItem key={subject.id} value={subject.id}>
                                {subject.name} ({subject.code})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Additional subject (if any)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {(() => {
                const primarySubjectId = form.watch("primarySubjectId");
                const secondarySubjectId = form.watch("secondarySubjectId");
                const primaryDepartmentId = subjects.find(
                  (s) => s.id === primarySubjectId
                )?.departmentId;
                const secondaryDepartmentId = subjects.find(
                  (s) => s.id === secondarySubjectId
                )?.departmentId;
                const permissible1 = form.watch("permissibleSubjectId1");
                const permissible2 = form.watch("permissibleSubjectId2");

                const reserved = new Set(
                  [primarySubjectId, secondarySubjectId].filter(Boolean)
                );
                const allowedDepartmentIds = new Set(
                  [primaryDepartmentId, secondaryDepartmentId].filter(Boolean)
                );
                const departmentSubjects = subjects.filter(
                  (s) =>
                    !reserved.has(s.id) &&
                    s.departmentId &&
                    allowedDepartmentIds.has(s.departmentId)
                );

                return (
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-sm font-semibold">
                        Permissible Subjects{" "}
                        <span className="text-muted-foreground font-normal">
                          (Optional, up to 2)
                        </span>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Extra subjects this teacher may also teach, limited to
                        the primary or secondary subject's department
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="permissibleSubjectId1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Permissible Subject 1{" "}
                              <span className="text-muted-foreground">
                                (Optional)
                              </span>
                            </FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(value === "NONE" ? "" : value)
                              }
                              value={field.value || "NONE"}
                              disabled={loadingSubjects || !primarySubjectId}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a permissible subject" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="NONE">None</SelectItem>
                                {departmentSubjects
                                  .filter((subject) => subject.id !== permissible2)
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

                      <FormField
                        control={form.control}
                        name="permissibleSubjectId2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Permissible Subject 2{" "}
                              <span className="text-muted-foreground">
                                (Optional)
                              </span>
                            </FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(value === "NONE" ? "" : value)
                              }
                              value={field.value || "NONE"}
                              disabled={loadingSubjects || !primarySubjectId}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a permissible subject" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="NONE">None</SelectItem>
                                {departmentSubjects
                                  .filter((subject) => subject.id !== permissible1)
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
                  </div>
                );
              })()}

              {loadingSubjects && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                  <span>Loading subjects...</span>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Review Information</h3>
                <p className="text-sm text-muted-foreground">
                  Please review all information before submitting
                </p>
              </div>

              <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                <div>
                  <h4 className="font-semibold text-sm mb-3 text-primary">
                    Personal Information
                  </h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Full Name:</dt>
                    <dd className="font-medium">
                      {form.getValues("firstName")}{" "}
                      {form.getValues("middleName")}{" "}
                      {form.getValues("lastName")}
                    </dd>
                    <dt className="text-muted-foreground">Gender:</dt>
                    <dd className="font-medium">{form.getValues("gender")}</dd>
                    <dt className="text-muted-foreground">Date of Birth:</dt>
                    <dd className="font-medium">
                      {form.getValues("dateOfBirth")
                        ? format(form.getValues("dateOfBirth"), "PPP")
                        : "Not provided"}
                    </dd>
                    <dt className="text-muted-foreground">Phone:</dt>
                    <dd className="font-medium">{form.getValues("phone")}</dd>
                  </dl>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3 text-primary">
                    Employment Details
                  </h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Staff Number:</dt>
                    <dd className="font-medium">
                      {form.getValues("staffNumber")}
                    </dd>
                    <dt className="text-muted-foreground">Email Address:</dt>
                    <dd className="font-medium">{form.getValues("email")}</dd>
                    <dt className="text-muted-foreground">Hire Date:</dt>
                    <dd className="font-medium">
                      {form.getValues("hireDate")
                        ? format(form.getValues("hireDate"), "PPP")
                        : "Not provided"}
                    </dd>
                    <dt className="text-muted-foreground">Status:</dt>
                    <dd className="font-medium">{form.getValues("status")}</dd>
                  </dl>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3 text-primary">
                    Qualification & Experience
                  </h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Qualification:</dt>
                    <dd className="font-medium">
                      {form.getValues("qualification")}
                    </dd>
                    <dt className="text-muted-foreground">
                      Years of Experience:
                    </dt>
                    <dd className="font-medium">
                      {form.getValues("yearsExperience") || 0} years
                    </dd>
                    <dt className="text-muted-foreground">Address:</dt>
                    <dd className="font-medium col-span-2">
                      {form.getValues("address") || "Not provided"}
                    </dd>
                  </dl>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3 text-primary">
                    Subject Specializations
                  </h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Primary Subject:</dt>
                    <dd className="font-medium">
                      {(() => {
                        const primarySubject = subjects.find(
                          (s) => s.id === form.getValues("primarySubjectId")
                        );
                        return primarySubject
                          ? `${primarySubject.name} (${primarySubject.code})`
                          : "Not selected";
                      })()}
                    </dd>
                    <dt className="text-muted-foreground">
                      Secondary Subject:
                    </dt>
                    <dd className="font-medium">
                      {(() => {
                        const secondarySubjectId =
                          form.getValues("secondarySubjectId");
                        if (!secondarySubjectId) return "None";
                        const secondarySubject = subjects.find(
                          (s) => s.id === secondarySubjectId
                        );
                        return secondarySubject
                          ? `${secondarySubject.name} (${secondarySubject.code})`
                          : "None";
                      })()}
                    </dd>
                    <dt className="text-muted-foreground">
                      Permissible Subjects:
                    </dt>
                    <dd className="font-medium">
                      {(() => {
                        const permissibleIds = [
                          form.getValues("permissibleSubjectId1"),
                          form.getValues("permissibleSubjectId2"),
                        ].filter((id): id is string => Boolean(id));

                        if (permissibleIds.length === 0) return "None";

                        return permissibleIds
                          .map((id) => {
                            const subject = subjects.find((s) => s.id === id);
                            return subject
                              ? `${subject.name} (${subject.code})`
                              : null;
                          })
                          .filter(Boolean)
                          .join(", ");
                      })()}
                    </dd>
                  </dl>
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg bg-primary/5">
                <Checkbox
                  id="review-confirm"
                  checked={isReviewConfirmed}
                  onCheckedChange={(checked) =>
                    setIsReviewConfirmed(checked === true)
                  }
                  className="mt-0.5"
                />
                <label
                  htmlFor="review-confirm"
                  className="text-sm font-medium leading-relaxed cursor-pointer select-none">
                  <CheckCircle2 className="h-4 w-4 inline mr-1.5 text-primary" />
                  I have reviewed all the information above and confirm it is
                  accurate and complete
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? onCancel : handlePrevious}
              disabled={isSubmitting}>
              {currentStep === 1 ? (
                "Cancel"
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </>
              )}
            </Button>

            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || !isReviewConfirmed}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
