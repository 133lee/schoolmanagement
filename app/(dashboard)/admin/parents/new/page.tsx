"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ParentForm } from "@/components/parent/parent-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useParents } from "@/hooks/useParents";

export default function NewParentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { createParent } = useParents();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      await createParent(data);

      toast({
        title: "Success",
        description: "Guardian created successfully",
      });

      // Redirect to parents list
      router.push("/admin/parents");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create guardian",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/parents");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Add New Guardian</h1>
          <p className="text-muted-foreground text-sm">
            Register a new parent or guardian in the system
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Guardian Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ParentForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
