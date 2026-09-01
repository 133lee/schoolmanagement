"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn, formatCompactClassLabel } from "@/lib/utils";

// Form validation schema
const assessmentFormSchema = z.object({
  // Step 1: Class & Subject
  classId: z.string().min(1, "Please select a class"),
  subjectId: z.string().min(1, "Please select a subject"),

  // Step 2: Assessment Details
  examType: z.enum(["CAT", "MID", "EOT"], { message: "Please select exam type" }),
  totalMarks: z.number().min(1, "Total marks must be at least 1").max(1000),
  passMark: z.number().min(0, "Pass mark cannot be negative"),
  weight: z.number().min(0.1).max(10),
  assessmentDate: z.date().optional(),
  termId: z.string().min(1, "Term is required"),
});

type AssessmentFormValues = z.infer<typeof assessmentFormSchema>;

interface AssessmentWizardProps {
  onSubmit: (data: AssessmentFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  classes: Array<{ id: string; name: string; grade: string }>;
  subjects: Array<{ id: string; name: string; code: string }>;
  termId: string;
}

const STEPS = [
  { id: 1, name: "Class & Subject", description: "Select class and subject" },
  { id: 2, name: "Assessment Details", description: "Exam type and marks" },
  { id: 3, name: "Review", description: "Confirm information" },
];

const EXAM_TYPE_LABELS: Record<string, string> = {
  CAT: "CAT (Continuous Assessment)",
  MID: "Mid-Term Exam",
  EOT: "End of Term Exam",
};

export function AssessmentWizard({
  onSubmit,
  onCancel,
  isSubmitting = false,
  classes,
  subjects,
  termId,
}: AssessmentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);

  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentFormSchema),
    defaultValues: {
      classId: "",
      subjectId: "",
      examType: undefined,
      totalMarks: 100,
      passMark: 50,
      weight: 1.0,
      assessmentDate: undefined,
      termId: termId,
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof AssessmentFormValues)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ["classId", "subjectId"];
        break;
      case 2:
        fieldsToValidate = ["examType", "totalMarks", "passMark", "weight"];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFormSubmit = async (data: AssessmentFormValues) => {
    await onSubmit(data);
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  // Get selected class and subject for review
  const selectedClass = classes.find((c) => c.id === form.watch("classId"));
  const selectedSubject = subjects.find((s) => s.id === form.watch("subjectId"));
  const selectedExamType = form.watch("examType");

  return (
    <div className="space-y-5">

      {/* ── Mobile: compact step indicator ──────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </p>
          <p className="text-xs font-semibold text-foreground">
            {STEPS[currentStep - 1].name}
          </p>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {STEPS[currentStep - 1].description}
        </p>
      </div>

      {/* ── Desktop: full circle stepper ─────────────────────────────────────── */}
      <div className="hidden sm:block space-y-4">
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
                  )}
                >
                  {currentStep > step.id ? "✓" : step.id}
                </div>
                <div className="text-center mt-2">
                  <p className={cn("text-xs font-medium", currentStep >= step.id ? "text-foreground" : "text-muted-foreground")}>
                    {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-[2px] flex-1 mx-2 -mt-12 transition-colors",
                    currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="w-full bg-muted-foreground/20 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Form Steps */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-5">
          {/* Step 1: Class & Subject */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold sm:text-lg">Select Class & Subject</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose which class and subject this assessment is for
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((classItem) => (
                            <SelectItem key={classItem.id} value={classItem.id}>
                              {formatCompactClassLabel(classItem.grade, classItem.name)}
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
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a subject" />
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
              </div>
            </div>
          )}

          {/* Step 2: Assessment Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold sm:text-lg">Assessment Details</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure marks and examination type
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="examType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exam Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select exam type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CAT">CAT (Continuous Assessment)</SelectItem>
                          <SelectItem value="MID">Mid-Term Exam</SelectItem>
                          <SelectItem value="EOT">End of Term Exam</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only 3 assessments per term: CAT, MID, and EOT
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="totalMarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Marks *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={1000}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="passMark"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pass Mark *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (for averaging)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step={0.1}
                          min={0.1}
                          max={10}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Used for calculating weighted averages (default: 1.0)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment Date (Optional)</FormLabel>
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
                          min="1900-01-01"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold sm:text-lg">Review Assessment</h3>
                  <p className="text-sm text-muted-foreground">
                    Please review the information before creating
                  </p>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Class</p>
                      <p className="text-sm font-semibold">
                        {selectedClass ? `${selectedClass.grade} ${selectedClass.name}` : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Subject</p>
                      <p className="text-sm font-semibold">
                        {selectedSubject ? `${selectedSubject.name} (${selectedSubject.code})` : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Exam Type</p>
                      <p className="text-sm font-semibold">
                        {selectedExamType ? EXAM_TYPE_LABELS[selectedExamType] : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Marks</p>
                      <p className="text-sm font-semibold">{form.watch("totalMarks")}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pass Mark</p>
                      <p className="text-sm font-semibold">{form.watch("passMark")}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Weight</p>
                      <p className="text-sm font-semibold">{form.watch("weight")}</p>
                    </div>
                    {form.watch("assessmentDate") && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Assessment Date</p>
                        <p className="text-sm font-semibold">
                          {form.watch("assessmentDate")!.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Confirmation Checkbox */}
                <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
                  <Checkbox
                    id="review-confirm"
                    checked={isReviewConfirmed}
                    onCheckedChange={(checked) =>
                      setIsReviewConfirmed(checked === true)
                    }
                  />
                  <label
                    htmlFor="review-confirm"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    I confirm that the above information is correct
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col-reverse gap-2 pt-4 border-t sm:flex-row sm:justify-between sm:pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? onCancel : handlePrevious}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              {currentStep === 1 ? "Cancel" : "Previous"}
            </Button>

            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext} className="w-full sm:w-auto">
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || !isReviewConfirmed}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Creating..." : "Create Assessment"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
