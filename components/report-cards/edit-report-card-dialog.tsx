"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PromotionStatus, GradeLevel } from "@/types/prisma-enums";

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
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReportCards } from "@/hooks/useReportCards";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Form validation schema
const editReportCardSchema = z.object({
  classTeacherRemarks: z.string().optional(),
  headTeacherRemarks: z.string().optional(),
  promotionStatus: z.nativeEnum(PromotionStatus).optional(),
  nextGrade: z.nativeEnum(GradeLevel).optional(),
});

type EditReportCardFormValues = z.infer<typeof editReportCardSchema>;

interface EditReportCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportCardId?: string;
  onSuccess?: () => void;
}

export function EditReportCardDialog({
  open,
  onOpenChange,
  reportCardId,
  onSuccess,
}: EditReportCardDialogProps) {
  const { toast } = useToast();
  const { getReportCard, updateReportCard } = useReportCards();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditReportCardFormValues>({
    resolver: zodResolver(editReportCardSchema),
    defaultValues: {
      classTeacherRemarks: "",
      headTeacherRemarks: "",
      promotionStatus: undefined,
      nextGrade: undefined,
    },
  });

  // Load report card data when dialog opens
  useEffect(() => {
    if (!open) return;
    if (!reportCardId) return;

    const fetchReportCard = async () => {
      try {
        setIsLoading(true);
        const data = await getReportCard(reportCardId);

        form.reset({
          classTeacherRemarks: data.classTeacherRemarks || "",
          headTeacherRemarks: data.headTeacherRemarks || "",
          promotionStatus: data.promotionStatus || undefined,
          nextGrade: data.nextGrade || undefined,
        });
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load report card data",
          variant: "destructive",
        });
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportCard();
  }, [open, reportCardId]);

  const handleSubmit = async (data: EditReportCardFormValues) => {
    if (!reportCardId) return;

    try {
      setIsSubmitting(true);

      await updateReportCard(reportCardId, {
        classTeacherRemarks: data.classTeacherRemarks || undefined,
        headTeacherRemarks: data.headTeacherRemarks || undefined,
        promotionStatus: data.promotionStatus || undefined,
        nextGrade: data.nextGrade || undefined,
      });

      toast({
        title: "Success",
        description: "Report card updated successfully",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update report card",
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
          <DialogTitle>Edit Report Card</DialogTitle>
          <DialogDescription>Update teacher remarks and promotion status</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="classTeacherRemarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Teacher Remarks</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter class teacher's remarks about the student's performance..."
                        className="resize-none"
                        rows={4}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Comments about the student's overall performance, behavior, and areas for improvement
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="headTeacherRemarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Head Teacher Remarks</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter head teacher's remarks..."
                        className="resize-none"
                        rows={4}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Official comments from the head teacher (requires HEAD_TEACHER role)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="promotionStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promotion Status</FormLabel>
                    <Select
                      disabled={isSubmitting}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select promotion status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={PromotionStatus.PROMOTED}>Promoted</SelectItem>
                        <SelectItem value={PromotionStatus.REPEATED}>Repeated</SelectItem>
                        <SelectItem value={PromotionStatus.GRADUATED}>Graduated</SelectItem>
                        <SelectItem value={PromotionStatus.TRANSFERRED}>Transferred</SelectItem>
                        <SelectItem value={PromotionStatus.WITHDRAWN}>Withdrawn</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Student's promotion status for the next academic year
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextGrade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Grade (if promoted)</FormLabel>
                    <Select
                      disabled={isSubmitting}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select next grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(GradeLevel).map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade.replace("GRADE_", "Grade ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The grade level the student will advance to if promoted
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Report Card
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
