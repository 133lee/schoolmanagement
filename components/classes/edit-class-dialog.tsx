"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ClassStatus } from "@/types/prisma-enums";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClasses } from "@/hooks/useClasses";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Form validation schema
const editClassSchema = z.object({
  name: z.string().min(1, "Class name must be at least 2 characters"),
  capacity: z.number().min(1, "Capacity must be at least 1").optional(),
  status: z.nativeEnum(ClassStatus),
});

type EditClassFormValues = z.infer<typeof editClassSchema>;

interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId?: string;
  onSuccess?: () => void;
}

export function EditClassDialog({
  open,
  onOpenChange,
  classId,
  onSuccess,
}: EditClassDialogProps) {
  const { toast } = useToast();
  const { getClass, updateClass } = useClasses();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditClassFormValues>({
    resolver: zodResolver(editClassSchema),
    defaultValues: {
      name: "",
      capacity: undefined,
      status: ClassStatus.ACTIVE,
    },
  });

  // Load class data when dialog opens
  useEffect(() => {
    if (!open) return;
    if (!classId) return;

    const fetchClass = async () => {
      try {
        setIsLoading(true);
        const data = await getClass(classId, false);

        form.reset({
          name: data.name,
          capacity: data.capacity || undefined,
          status: data.status,
        });
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load class data",
          variant: "destructive",
        });
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClass();
  }, [open, classId]);

  const handleSubmit = async (data: EditClassFormValues) => {
    if (!classId) return;

    try {
      setIsSubmitting(true);

      // Format data for API
      const formattedData = {
        name: data.name,
        capacity: data.capacity || undefined,
        status: data.status,
      };

      await updateClass(classId, formattedData);

      toast({
        title: "Success",
        description: "Class updated successfully",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update class",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription>Update class information</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading class data...
              </p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Class A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Capacity{" "}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="30"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(
                              value ? parseInt(value, 10) : undefined
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ClassStatus.ACTIVE}>
                            Active
                          </SelectItem>
                          <SelectItem value={ClassStatus.INACTIVE}>
                            Inactive
                          </SelectItem>
                          <SelectItem value={ClassStatus.ARCHIVED}>
                            Archived
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Class"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
