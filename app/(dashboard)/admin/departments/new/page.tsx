"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DepartmentForm } from "@/components/departments/department-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useDepartments } from "@/hooks/useDepartments";

export default function NewDepartmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { createDepartment } = useDepartments();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hodOptions, setHodOptions] = useState<Array<{ id: string; name: string; email: string }>>([]);

  // Fetch HOD options on component mount
  useEffect(() => {
    const fetchHodOptions = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch("/api/users?role=HOD", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          const hods = data.data.map((user: any) => ({
            id: user.id,
            name: user.profile
              ? `${user.profile.firstName} ${user.profile.lastName}`
              : user.email,
            email: user.email,
          }));
          setHodOptions(hods);
        }
      } catch (error) {
        console.error("Failed to fetch HOD options:", error);
      }
    };

    fetchHodOptions();
  }, []);

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      await createDepartment(data);

      toast({
        title: "Success",
        description: "Department created successfully",
      });

      // Redirect to departments list
      router.push("/admin/departments");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create department",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/departments");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Add New Department</h1>
          <p className="text-muted-foreground text-sm">
            Create a new department in the system
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Department Information</CardTitle>
        </CardHeader>
        <CardContent>
          <DepartmentForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            hodOptions={hodOptions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
