"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StudentForm } from "@/components/students/student-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useStudents } from "@/hooks/useStudents";

export default function NewStudentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { createStudent } = useStudents();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      // Format dates to ISO strings for API
      const formattedData = {
        ...data,
        dateOfBirth: data.dateOfBirth.toISOString(),
        admissionDate: data.admissionDate.toISOString(),
      };

      await createStudent(formattedData);

      toast({
        title: "Success",
        description: "Student created successfully",
      });

      // Redirect to students list
      router.push("/admin/students");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create student",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/students");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Add New Student</h1>
          <p className="text-muted-foreground text-sm">
            Register a new student in the system
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
