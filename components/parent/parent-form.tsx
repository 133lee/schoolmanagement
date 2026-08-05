"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { ParentStatus } from "@/types/prisma-enums";

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
const parentFormSchema = z.object({
  // Step 1: Personal Information
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),

  // Step 2: Additional Information
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().optional(),
  occupation: z.string().optional(),
  status: z.nativeEnum(ParentStatus),
});

type ParentFormValues = z.infer<typeof parentFormSchema>;

interface ParentFormProps {
  onSubmit: (data: ParentFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: Partial<ParentFormValues>;
}

const STEPS = [
  { id: 1, name: "Personal Info", description: "Basic contact information" },
  { id: 2, name: "Additional Info", description: "Optional details" },
  { id: 3, name: "Review", description: "Confirm information" },
];

export function ParentForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData,
}: ParentFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);

  const form = useForm<ParentFormValues>({
    resolver: zodResolver(parentFormSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      address: initialData?.address || "",
      occupation: initialData?.occupation || "",
      status: initialData?.status || ParentStatus.ACTIVE,
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof ParentFormValues)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ["firstName", "lastName", "phone"];
        break;
      case 2:
        fieldsToValidate = ["email", "address", "occupation", "status"];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    // Reset confirmation if going back from review step
    if (currentStep === 3) {
      setIsReviewConfirmed(false);
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFormSubmit = async (data: ParentFormValues) => {
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
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the guardian's basic contact details
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+260 XXX XXX XXX" {...field} />
                      </FormControl>
                      <FormDescription>
                        Primary contact number for the guardian
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Step 2: Additional Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Additional Information
                </h3>
                <p className="text-sm text-muted-foreground">
                  Optional details about the guardian
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>
                        Email{" "}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john.doe@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Occupation{" "}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Teacher, Farmer, etc." {...field} />
                      </FormControl>
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
                          <SelectItem value={ParentStatus.ACTIVE}>
                            Active
                          </SelectItem>
                          <SelectItem value={ParentStatus.INACTIVE}>
                            Inactive
                          </SelectItem>
                          <SelectItem value={ParentStatus.DECEASED}>
                            Deceased
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
                      <FormDescription>
                        Guardian's residential address
                      </FormDescription>
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
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <dt className="text-muted-foreground font-medium">
                      Full Name:
                    </dt>
                    <dd className="font-semibold">
                      {form.getValues("firstName")} {form.getValues("lastName")}
                    </dd>
                    <dt className="text-muted-foreground font-medium">
                      Phone:
                    </dt>
                    <dd className="font-semibold">{form.getValues("phone")}</dd>
                    <dt className="text-muted-foreground font-medium">
                      Email:
                    </dt>
                    <dd className="font-semibold">
                      {form.getValues("email") || (
                        <span className="text-muted-foreground font-normal">
                          Not provided
                        </span>
                      )}
                    </dd>
                  </dl>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3 text-primary">
                    Additional Details
                  </h4>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <dt className="text-muted-foreground font-medium">
                      Occupation:
                    </dt>
                    <dd className="font-semibold">
                      {form.getValues("occupation") || (
                        <span className="text-muted-foreground font-normal">
                          Not provided
                        </span>
                      )}
                    </dd>
                    <dt className="text-muted-foreground font-medium">
                      Status:
                    </dt>
                    <dd className="font-semibold capitalize">
                      {form.getValues("status")?.toLowerCase()}
                    </dd>
                    <dt className="text-muted-foreground font-medium col-span-2">
                      Address:
                    </dt>
                    <dd className="font-semibold col-span-2">
                      {form.getValues("address") || (
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
