"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTeachers } from "@/hooks/useTeachers";
import { Loader2, AlertCircle, Search, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ManageClassTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  currentTeacherId?: string | null;
  onSuccess: () => void;
}

export function ManageClassTeacherDialog({
  open,
  onOpenChange,
  classId,
  className,
  currentTeacherId,
  onSuccess,
}: ManageClassTeacherDialogProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const { teachers, isLoading: loadingTeachers } = useTeachers(
    { status: "ACTIVE", mode: "all" },
    { page: 1, pageSize: 10 } // Not used when mode=all, but required by the hook
  );

  // Filter teachers based on search query
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;

    const query = searchQuery.toLowerCase();
    return teachers.filter((teacher) => {
      const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
      const staffNumber = teacher.staffNumber.toLowerCase();
      return fullName.includes(query) || staffNumber.includes(query);
    });
  }, [teachers, searchQuery]);

  useEffect(() => {
    if (open && currentTeacherId) {
      setSelectedTeacherId(currentTeacherId);
    } else if (open) {
      setSelectedTeacherId("");
    }
    setError(null);
    setSearchQuery(""); // Reset search when dialog opens
  }, [open, currentTeacherId]);

  const handleSubmit = async () => {
    if (!selectedTeacherId) {
      toast.error("Please select a teacher");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);
    const teacherName = selectedTeacher
      ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}`
      : "teacher";

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be logged in to perform this action");
      }

      const response = await fetch(`/api/classes/${classId}/class-teacher`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacherId: selectedTeacherId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to assign class teacher");
      }

      toast.success(`${teacherName} assigned as class teacher for ${className}`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveClick = () => {
    setShowRemoveConfirm(true);
  };

  const handleRemoveConfirm = async () => {
    if (!currentTeacherId) return;

    setIsSubmitting(true);
    setError(null);
    setShowRemoveConfirm(false);

    const currentTeacher = teachers.find((t) => t.id === currentTeacherId);
    const teacherName = currentTeacher
      ? `${currentTeacher.firstName} ${currentTeacher.lastName}`
      : "teacher";

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be logged in to perform this action");
      }

      const response = await fetch(`/api/classes/${classId}/class-teacher`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to remove class teacher");
      }

      toast.success(`${teacherName} removed as class teacher from ${className}`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);
  const hasCurrentTeacher = !!currentTeacherId;
  const currentTeacher = teachers.find((t) => t.id === currentTeacherId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>
            {hasCurrentTeacher ? "Manage" : "Assign"} Class Teacher
          </DialogTitle>
          <DialogDescription>
            {hasCurrentTeacher
              ? `Reassign or remove the class teacher for ${className}`
              : `Select a teacher to assign as class teacher for ${className}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="teacher">Select Teacher</Label>
            {loadingTeachers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search teachers by name or staff number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Teacher List */}
                <div className="border rounded-md">
                  <ScrollArea className="h-60">
                    {filteredTeachers.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        No teachers found
                      </div>
                    ) : (
                      <div className="p-1">
                        {filteredTeachers.map((teacher) => {
                          const isSelected = selectedTeacherId === teacher.id;
                          const fullName = `${teacher.firstName} ${teacher.lastName}`;
                          const initials = `${teacher.firstName[0]}${teacher.lastName[0]}`;

                          return (
                            <div
                              key={teacher.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-accent transition-colors",
                                isSelected && "bg-accent"
                              )}
                              onClick={() => setSelectedTeacherId(teacher.id)}
                            >
                              <Avatar className="h-9 w-9">
                                <AvatarImage src="" alt={fullName} />
                                <AvatarFallback className="text-xs">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {fullName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {teacher.staffNumber}
                                </p>
                              </div>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </>
            )}
          </div>

          {selectedTeacher && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Selected Teacher
              </p>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" alt={`${selectedTeacher.firstName} ${selectedTeacher.lastName}`} />
                  <AvatarFallback>
                    {selectedTeacher.firstName[0]}{selectedTeacher.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {selectedTeacher.firstName} {selectedTeacher.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedTeacher.staffNumber}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {hasCurrentTeacher && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemoveClick}
              disabled={isSubmitting || loadingTeachers}>
              Remove Teacher
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || loadingTeachers || !selectedTeacherId}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {hasCurrentTeacher ? "Reassigning..." : "Assigning..."}
              </>
            ) : (
              <>
                {hasCurrentTeacher ? "Reassign Teacher" : "Assign Teacher"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Remove Confirmation Dialog */}
    <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Class Teacher?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove{" "}
            <span className="font-semibold">
              {currentTeacher
                ? `${currentTeacher.firstName} ${currentTeacher.lastName}`
                : "this teacher"}
            </span>{" "}
            as class teacher from <span className="font-semibold">{className}</span>?
            {" "}This action will also remove all subject teacher assignments for this class.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemoveConfirm}
            disabled={isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              "Remove Teacher"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
