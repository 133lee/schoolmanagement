"use client";

import { useState } from "react";
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

interface CreateAcademicYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateAcademicYearDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateAcademicYearDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    startDate: "",
    endDate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/academic-years", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create academic year");
      }

      toast({
        title: "Success",
        description: "Academic year created successfully",
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        year: new Date().getFullYear(),
        startDate: "",
        endDate: "",
      });
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
          <DialogTitle>Create Academic Year</DialogTitle>
          <DialogDescription>
            Add a new academic year to the system. This will define the operational calendar.
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
              <p className="text-xs text-muted-foreground">
                The calendar year (e.g., 2024 for 2024-2025 school year)
              </p>
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

          <DialogFooter>
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
              Create Academic Year
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
