"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { ClassStatus } from "@/types/prisma-enums";

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
const classFormSchema = z.object({
  // Step 1: Basic Information
  gradeId: z.string().min(1, "Please select a grade"),
  name: z.string().min(1, "Class name must be at least 1 character"),
  capacity: z
    .number()
    .min(1, "Capacity must be at least 1")
    .max(100, "Capacity cannot exceed 100"),
  status: z.nativeEnum(ClassStatus),
});

type ClassFormValues = z.infer<typeof classFormSchema>;

interface ClassFormProps {
  onSubmit: (data: ClassFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: Partial<ClassFormValues>;
  grades?: Array<{ id: string; name: string }>;
}

const STEPS = [
  { id: 1, name: "Class Info", description: "Basic details" },
  { id: 2, name: "Review", description: "Confirm information" },
];

export function ClassForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData,
  grades = [],
}: ClassFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      gradeId: initialData?.gradeId || "",
      name: initialData?.name || "",
      capacity: initialData?.capacity || 40,
      status: initialData?.status || ClassStatus.ACTIVE,
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof ClassFormValues)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ["gradeId", "name", "capacity", "status"];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    // Reset confirmation if going back from review step
    if (currentStep === 2) {
      setIsReviewConfirmed(false);
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFormSubmit = async (data: ClassFormValues) => {
    await onSubmit(data);
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  const getGradeName = (gradeId: string) => {
    const grade = grades.find((g) => g.id === gradeId);
    return grade?.name || "Unknown Grade";
  };

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
          {/* Step 1: Class Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Class Information</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the class details
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gradeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a grade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {grades.map((grade) => (
                            <SelectItem key={grade.id} value={grade.id}>
                              {grade.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The grade this class belongs to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Name</FormLabel>
                      <FormControl>
                        <Input placeholder="F1 Blue, F2-A, or A, B" {...field} />
                      </FormControl>
                      <FormDescription>
                        For Forms use: F1 Blue, F2-A (F + number + space/dash + name)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="40"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of students
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
                          <SelectItem value={ClassStatus.ACTIVE}>
                            Active
                          </SelectItem>
                          <SelectItem value={ClassStatus.INACTIVE}>
                            Inactive
                          </SelectItem>
                          <SelectItem value={ClassStatus.ARCHIVED}>
                            Archived
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
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {currentStep === 2 && (
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
                    Class Details
                  </h4>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <dt className="text-muted-foreground font-medium">
                      Grade:
                    </dt>
                    <dd className="font-semibold">
                      {getGradeName(form.getValues("gradeId"))}
                    </dd>
                    <dt className="text-muted-foreground font-medium">
                      Class Name:
                    </dt>
                    <dd className="font-semibold">{form.getValues("name")}</dd>
                    <dt className="text-muted-foreground font-medium">
                      Capacity:
                    </dt>
                    <dd className="font-semibold">
                      {form.getValues("capacity")} students
                    </dd>
                    <dt className="text-muted-foreground font-medium">
                      Status:
                    </dt>
                    <dd className="font-semibold capitalize">
                      {form.getValues("status")?.toLowerCase()}
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
