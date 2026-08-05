"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClassForm } from "@/components/classes/class-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useClasses } from "@/hooks/useClasses";
import { useGrades } from "@/hooks/useGrades";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewClassPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { createClass } = useClasses();
  const { grades, isLoading: gradesLoading, error: gradesError } = useGrades();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      await createClass(data);

      toast({
        title: "Success",
        description: "Class created successfully",
      });

      // Redirect to classes list
      router.push("/admin/classes");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create class",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/classes");
  };

  // Show loading state while grades are being fetched
  if (gradesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between mt-2">
          <div className="flex flex-col space-y-2">
            <h1 className="text-xl font-bold">Add New Class</h1>
            <p className="text-muted-foreground text-sm">
              Create a new class in the system
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
            <Skeleton className="h-9 w-24 mt-2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if grades failed to load
  if (gradesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between mt-2">
          <div className="flex flex-col space-y-2">
            <h1 className="text-xl font-bold">Add New Class</h1>
            <p className="text-muted-foreground text-sm">
              Create a new class in the system
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="p-4 bg-destructive/10 text-destructive rounded-md">
              <p className="font-medium">Error loading grades</p>
              <p className="text-sm">{gradesError}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Add New Class</h1>
          <p className="text-muted-foreground text-sm">
            Create a new class in the system
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Class Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ClassForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            grades={grades}
          />
        </CardContent>
      </Card>
    </div>
  );
}
