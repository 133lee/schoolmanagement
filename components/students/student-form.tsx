"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import {
  Gender,
  StudentStatus,
  VulnerabilityStatus,
} from "@/types/prisma-enums";

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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  studentFormSchema,
  type StudentFormValues,
} from "./student-form-schema";

interface StudentFormProps {
  onSubmit: (data: StudentFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: Partial<StudentFormValues>;
}

const STEPS = [
  { id: 1, name: "Personal Info", description: "Basic student information" },
  { id: 2, name: "Student Details", description: "Admission information" },
  { id: 3, name: "Contact & Medical", description: "Additional details" },
  { id: 4, name: "Review", description: "Confirm information" },
];

export function StudentForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData,
}: StudentFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);

  // Generate student number
  const generateStudentNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `STU-${year}-${random}`;
  };

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      firstName: initialData?.firstName ?? "",
      middleName: initialData?.middleName ?? undefined,
      lastName: initialData?.lastName ?? "",
      gender: initialData?.gender ?? undefined,
      dateOfBirth: initialData?.dateOfBirth ?? undefined,
      studentNumber: initialData?.studentNumber ?? generateStudentNumber(),
      admissionDate: initialData?.admissionDate ?? new Date(),
      status: initialData?.status ?? StudentStatus.ACTIVE,
      vulnerability:
        initialData?.vulnerability ?? VulnerabilityStatus.NOT_VULNERABLE,
      address: initialData?.address ?? undefined,
      medicalInfo: initialData?.medicalInfo ?? undefined,
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof StudentFormValues)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ["firstName", "lastName", "gender", "dateOfBirth"];
        break;
      case 2:
        fieldsToValidate = [
          "studentNumber",
          "admissionDate",
          "status",
          "vulnerability",
        ];
        break;
      case 3:
        fieldsToValidate = ["address", "medicalInfo"];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    // Reset confirmation if going back from review step
    if (currentStep === 4) {
      setIsReviewConfirmed(false);
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
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
                    "h-[2px] flex-1 mx-2 -mt-12 transition-colors",
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the student's basic personal details
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        First Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
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
                        <span className="text-muted-foreground text-xs">
                          (Optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Michael"
                          {...field}
                          value={field.value || ""}
                        />
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
                      <FormLabel>
                        Last Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
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
                      <FormLabel>
                        Gender <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}>
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
                    <FormItem className="md:col-span-2">
                      <FormLabel>
                        Date of Birth{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
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
                          max={
                            new Date(new Date().getFullYear() - 3, 0, 1)
                              .toISOString()
                              .split("T")[0]
                          }
                          min={
                            new Date(new Date().getFullYear() - 25, 0, 1)
                              .toISOString()
                              .split("T")[0]
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Student must be between 3 and 25 years old
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Step 2: Student Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Student Details</h3>
                <p className="text-sm text-muted-foreground">
                  Enter admission and enrollment information
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="studentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Student Number{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="STU-2024-0001"
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
                    <FormItem>
                      <FormLabel>
                        Status <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={StudentStatus.ACTIVE}>
                            Active
                          </SelectItem>
                          <SelectItem value={StudentStatus.SUSPENDED}>
                            Suspended
                          </SelectItem>
                          <SelectItem value={StudentStatus.GRADUATED}>
                            Graduated
                          </SelectItem>
                          <SelectItem value={StudentStatus.WITHDRAWN}>
                            Withdrawn
                          </SelectItem>
                          <SelectItem value={StudentStatus.TRANSFERRED}>
                            Transferred
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="admissionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Admission Date{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
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
                        />
                      </FormControl>
                      <FormDescription>
                        Date the student was admitted
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vulnerability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vulnerability Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vulnerability status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem
                            value={VulnerabilityStatus.NOT_VULNERABLE}>
                            Not Vulnerable
                          </SelectItem>
                          <SelectItem value={VulnerabilityStatus.ORPHAN}>
                            Orphan
                          </SelectItem>
                          <SelectItem
                            value={VulnerabilityStatus.VULNERABLE_CHILD}>
                            Vulnerable Child
                          </SelectItem>
                          <SelectItem value={VulnerabilityStatus.SPECIAL_NEEDS}>
                            Special Needs
                          </SelectItem>
                          <SelectItem
                            value={VulnerabilityStatus.UNDER_FIVE_INITIATIVE}>
                            Under Five Initiative
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Special support or monitoring requirements
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Step 3: Contact & Medical */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Contact & Medical Information
                </h3>
                <p className="text-sm text-muted-foreground">
                  Additional information about the student
                </p>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Address{" "}
                        <span className="text-muted-foreground text-xs">
                          (Optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="123 Main Street, City, Country"
                          className="resize-none"
                          rows={3}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Student's residential address (max 500 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medicalInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Medical Information{" "}
                        <span className="text-muted-foreground text-xs">
                          (Optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Allergies, conditions, medications, special requirements..."
                          className="resize-none"
                          rows={4}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Any medical conditions, allergies, or important health
                        information (max 1000 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
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
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground font-medium">
                        Full Name:
                      </dt>
                      <dd className="font-semibold mt-1">
                        {[
                          form.getValues("firstName"),
                          form.getValues("middleName"),
                          form.getValues("lastName"),
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground font-medium">
                        Gender:
                      </dt>
                      <dd className="font-semibold mt-1 capitalize">
                        {form.getValues("gender")?.toLowerCase()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground font-medium">
                        Date of Birth:
                      </dt>
                      <dd className="font-semibold mt-1">
                        {form.getValues("dateOfBirth")?.toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3 text-primary">
                    Student Details
                  </h4>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground font-medium">
                        Student Number:
                      </dt>
                      <dd className="font-semibold mt-1 font-mono">
                        {form.getValues("studentNumber")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground font-medium">
                        Status:
                      </dt>
                      <dd className="font-semibold mt-1 capitalize">
                        {form.getValues("status")?.toLowerCase()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground font-medium">
                        Admission Date:
                      </dt>
                      <dd className="font-semibold mt-1">
                        {form.getValues("admissionDate")?.toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground font-medium">
                        Vulnerability:
                      </dt>
                      <dd className="font-semibold mt-1">
                        {form
                          .getValues("vulnerability")
                          ?.replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3 text-primary">
                    Contact & Medical
                  </h4>
                  <dl className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground font-medium">
                        Address:
                      </dt>
                      <dd className="font-semibold mt-1">
                        {form.getValues("address") || (
                          <span className="text-muted-foreground font-normal">
                            Not provided
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground font-medium">
                        Medical Info:
                      </dt>
                      <dd className="font-semibold mt-1">
                        {form.getValues("medicalInfo") || (
                          <span className="text-muted-foreground font-normal">
                            None
                          </span>
                        )}
                      </dd>
                    </div>
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
