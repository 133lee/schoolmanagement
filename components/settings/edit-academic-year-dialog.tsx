"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AcademicYear {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
}

interface EditAcademicYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: AcademicYear | null;
  onSuccess: () => void;
}

export function EditAcademicYearDialog({
  open,
  onOpenChange,
  year,
  onSuccess,
}: EditAcademicYearDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    year: 0,
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (year) {
      setFormData({
        year: year.year,
        startDate: year.startDate.split("T")[0],
        endDate: year.endDate.split("T")[0],
      });
    }
  }, [year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!year) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/academic-years/${year.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update academic year");
      }

      toast({
        title: "Success",
        description: "Academic year updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!year) return;

    if (!confirm(`Are you sure you want to delete the ${year.year} academic year? This action cannot be undone.`)) {
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/academic-years/${year.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete academic year");
      }

      toast({
        title: "Success",
        description: "Academic year deleted successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Academic Year</DialogTitle>
          <DialogDescription>
            Update academic year information. Changes may affect existing assessments and records.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="year">
                Year <span className="text-red-500">*</span>
              </Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: parseInt(e.target.value) })
                }
                placeholder="e.g., 2024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">
                End Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                required
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              Delete
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
