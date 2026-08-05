"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherForm } from "@/components/teachers/teacher-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTeachers } from "@/hooks/useTeachers";

export default function NewTeacherPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { createTeacher } = useTeachers();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      // Format dates to ISO strings for API
      const formattedData = {
        ...data,
        dateOfBirth: data.dateOfBirth.toISOString(),
        hireDate: data.hireDate.toISOString(),
      };

      await createTeacher(formattedData);

      toast({
        title: "Success",
        description: "Teacher created successfully",
      });

      // Redirect to teachers list
      router.push("/admin/teachers");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create teacher",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/teachers");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Add New Teacher</h1>
          <p className="text-muted-foreground text-sm">
            Register a new teacher in the system
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Teacher Information</CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
