"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

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
const subjectFormSchema = z.object({
  // Step 1: Basic Information
  name: z.string().min(2, "Subject name must be at least 2 characters"),
  code: z
    .string()
    .min(2, "Subject code must be at least 2 characters")
    .max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  departmentId: z.string().optional(),
});

type SubjectFormValues = z.infer<typeof subjectFormSchema>;

interface SubjectFormProps {
  onSubmit: (data: SubjectFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: Partial<SubjectFormValues>;
  departments?: Array<{ id: string; name: string }>;
}

const STEPS = [
  { id: 1, name: "Subject Info", description: "Basic details" },
  { id: 2, name: "Review", description: "Confirm information" },
];

export function SubjectForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData,
  departments = [],
}: SubjectFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      description: initialData?.description || "",
      departmentId: initialData?.departmentId || "",
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof SubjectFormValues)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ["name", "code", "description", "departmentId"];
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

  const handleFormSubmit = async (data: SubjectFormValues) => {
    await onSubmit(data);
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  const getDepartmentName = (departmentId: string) => {
    const department = departments.find((d) => d.id === departmentId);
    return department?.name || "None";
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
          {/* Step 1: Subject Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Subject Information</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the subject's basic details
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Mathematics" {...field} />
                      </FormControl>
                      <FormDescription>
                        Full name of the subject
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
                      <FormLabel>Subject Code</FormLabel>
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
                        Unique code (e.g., MATH, ENG, SCI)
                      </FormDescription>
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
                        onValueChange={(value) =>
                          field.onChange(value === "none" ? undefined : value)
                        }
                        defaultValue={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {departments.map((department) => (
                            <SelectItem
                              key={department.id}
                              value={department.id}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Department this subject belongs to
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
                          placeholder="Subject description and objectives..."
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Brief description of the subject
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
                    Subject Details
                  </h4>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <dt className="text-muted-foreground font-medium">
                      Subject Name:
                    </dt>
                    <dd className="font-semibold">{form.getValues("name")}</dd>
                    <dt className="text-muted-foreground font-medium">
                      Subject Code:
                    </dt>
                    <dd className="font-semibold">{form.getValues("code")}</dd>
                    <dt className="text-muted-foreground font-medium">
                      Department:
                    </dt>
                    <dd className="font-semibold">
                      {form.getValues("departmentId")
                        ? getDepartmentName(form.getValues("departmentId")!)
                        : "None"}
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
