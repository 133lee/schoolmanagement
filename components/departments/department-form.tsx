"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { DepartmentStatus } from "@/types/prisma-enums";

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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Form validation schema
const departmentFormSchema = z.object({
  // Step 1: Basic Information
  name: z.string().min(2, "Department name must be at least 2 characters"),
  code: z
    .string()
    .min(2, "Department code must be at least 2 characters")
    .max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  status: z.nativeEnum(DepartmentStatus),
  hodTeacherId: z.string().optional(),
});

type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

interface DepartmentFormProps {
  onSubmit: (data: DepartmentFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: Partial<DepartmentFormValues>;
  hodOptions?: Array<{ id: string; name: string; email: string }>;
}

const STEPS = [
  { id: 1, name: "Department Info", description: "Basic details" },
  { id: 2, name: "Review", description: "Confirm information" },
];

export function DepartmentForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData,
  hodOptions = [],
}: DepartmentFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      description: initialData?.description || "",
      status: initialData?.status || DepartmentStatus.ACTIVE,
      hodTeacherId: initialData?.hodTeacherId || "",
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof DepartmentFormValues)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ["name", "code", "description", "status", "hodTeacherId"];
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

  const handleFormSubmit = async (data: DepartmentFormValues) => {
    await onSubmit(data);
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
          {/* Step 1: Department Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Department Information
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enter the department's basic details
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Mathematics Department"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Full name of the department
                      </FormDescription>
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
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Unique code (e.g., MATH, SCI, LANG)
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
                          <SelectItem value={DepartmentStatus.ACTIVE}>
                            Active
                          </SelectItem>
                          <SelectItem value={DepartmentStatus.INACTIVE}>
                            Inactive
                          </SelectItem>
                          <SelectItem value={DepartmentStatus.ARCHIVED}>
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

                <FormField
                  control={form.control}
                  name="hodTeacherId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
                        Head of Department{" "}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "none" ? undefined : value)
                        }
                        value={field.value || "none"}>
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
                      <FormDescription>
                        Assign a teacher with HOD role
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>
                        Description{" "}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Department description and responsibilities..."
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Brief description of the department's role
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
                    Department Details
                  </h4>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <dt className="text-muted-foreground font-medium">
                      Department Name:
                    </dt>
                    <dd className="font-semibold">{form.getValues("name")}</dd>
                    <dt className="text-muted-foreground font-medium">
                      Department Code:
                    </dt>
                    <dd className="font-semibold">{form.getValues("code")}</dd>
                    <dt className="text-muted-foreground font-medium">
                      Status:
                    </dt>
                    <dd className="font-semibold capitalize">
                      {form.getValues("status")?.toLowerCase()}
                    </dd>
                    <dt className="text-muted-foreground font-medium">
                      Head of Department:
                    </dt>
                    <dd className="font-semibold">
                      {form.getValues("hodTeacherId")
                        ? hodOptions.find(
                            (hod) => hod.id === form.getValues("hodTeacherId")
                          )?.name || "Not found"
                        : "Not assigned"}
                    </dd>
                    <dt className="text-muted-foreground font-medium col-span-2">
                      Description:
                    </dt>
                    <dd className="font-semibold col-span-2">
                      {form.getValues("description") || (
                        <span className="text-muted-foreground font-normal">
                          Not provided
                        </span>
                      )}
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
