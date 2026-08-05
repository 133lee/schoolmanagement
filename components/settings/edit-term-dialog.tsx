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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Term {
  id: string;
  termType: "TERM_1" | "TERM_2" | "TERM_3";
  startDate: string;
  endDate: string;
  isActive: boolean;
  academicYear: {
    id: string;
    year: number;
  };
}

interface EditTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  term: Term | null;
  onSuccess: () => void;
}

export function EditTermDialog({
  open,
  onOpenChange,
  term,
  onSuccess,
}: EditTermDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    termType: "TERM_1",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (term) {
      setFormData({
        termType: term.termType,
        startDate: term.startDate.split("T")[0],
        endDate: term.endDate.split("T")[0],
      });
    }
  }, [term]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/terms/${term.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update term");
      }

      toast({
        title: "Success",
        description: "Term updated successfully",
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
    if (!term) return;

    if (!confirm(`Are you sure you want to delete ${term.termType}? This action cannot be undone.`)) {
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/terms/${term.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete term");
      }

      toast({
        title: "Success",
        description: "Term deleted successfully",
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
          <DialogTitle>Edit Term</DialogTitle>
          <DialogDescription>
            Update term information. Changes may affect existing assessments and attendance records.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="termType">
                Term <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.termType}
                onValueChange={(value) =>
                  setFormData({ ...formData, termType: value as "TERM_1" | "TERM_2" | "TERM_3" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TERM_1">Term 1</SelectItem>
                  <SelectItem value="TERM_2">Term 2</SelectItem>
                  <SelectItem value="TERM_3">Term 3</SelectItem>
                </SelectContent>
              </Select>
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
