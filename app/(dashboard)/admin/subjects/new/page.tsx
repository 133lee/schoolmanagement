"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SubjectForm } from "@/components/subjects/subject-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSubjects } from "@/hooks/useSubjects";
import { useDepartments } from "@/hooks/useDepartments";

export default function NewSubjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { createSubject } = useSubjects();
  const { departments } = useDepartments({}, { page: 1, pageSize: 100 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      await createSubject(data);

      toast({
        title: "Success",
        description: "Subject created successfully",
      });

      // Redirect to subjects list
      router.push("/admin/subjects");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create subject",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/subjects");
  };

  // Transform departments data for the form
  const departmentsForForm = departments.map((dept: any) => ({
    id: dept.id,
    name: dept.name,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Add New Subject</h1>
          <p className="text-muted-foreground text-sm">
            Create a new subject in the system
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Information</CardTitle>
        </CardHeader>
        <CardContent>
          <SubjectForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            departments={departmentsForForm}
          />
        </CardContent>
      </Card>
    </div>
  );
}
