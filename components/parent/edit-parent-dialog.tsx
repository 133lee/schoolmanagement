"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ParentStatus } from "@/types/prisma-enums";

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
import { useParents } from "@/hooks/useParents";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Form validation schema
const editParentSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  middleName: z.string().optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().optional(),
  occupation: z.string().optional(),
  status: z.nativeEnum(ParentStatus),
});

type EditParentFormValues = z.infer<typeof editParentSchema>;

interface EditParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string;
  onSuccess?: () => void;
}

export function EditParentDialog({
  open,
  onOpenChange,
  parentId,
  onSuccess,
}: EditParentDialogProps) {
  const { toast } = useToast();
  const { getParent, updateParent } = useParents();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditParentFormValues>({
    resolver: zodResolver(editParentSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      phone: "",
      email: "",
      address: "",
      occupation: "",
      status: ParentStatus.ACTIVE,
    },
  });

  // Load parent data when dialog opens
  useEffect(() => {
    if (!open) return;
    if (!parentId) return;

    const fetchParent = async () => {
      try {
        setIsLoading(true);
        const data = await getParent(parentId, false);

        form.reset({
          firstName: data.firstName,
          middleName: "",
          lastName: data.lastName,
          phone: data.phone,
          email: data.email || "",
          address: data.address || "",
          occupation: data.occupation || "",
          status: data.status,
        });
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load parent data",
          variant: "destructive",
        });
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParent();
  }, [open, parentId]);

  const handleSubmit = async (data: EditParentFormValues) => {
    if (!parentId) return;

    try {
      setIsSubmitting(true);

      // Format data for API
      const formattedData = {
        firstName: data.firstName,
        middleName: data.middleName || undefined,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address || undefined,
        occupation: data.occupation || undefined,
        status: data.status,
      };

      await updateParent(parentId, formattedData);

      toast({
        title: "Success",
        description: "Parent/Guardian updated successfully",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update parent",
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Parent/Guardian</DialogTitle>
          <DialogDescription>
            Update parent/guardian information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading parent data...</p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Middle Name <span className="text-muted-foreground">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+260..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email <span className="text-muted-foreground">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Occupation <span className="text-muted-foreground">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Engineer" {...field} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ParentStatus.ACTIVE}>Active</SelectItem>
                          <SelectItem value={ParentStatus.INACTIVE}>Inactive</SelectItem>
                          <SelectItem value={ParentStatus.DECEASED}>Deceased</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>
                        Address <span className="text-muted-foreground">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street, City" {...field} />
                      </FormControl>
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
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Parent"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
