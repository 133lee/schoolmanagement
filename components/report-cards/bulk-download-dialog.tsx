"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Download } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useTerms } from "@/hooks/useTerms";
import { useReportCards } from "@/hooks/useReportCards";
import { downloadClassReportCards } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";

const bulkDownloadSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  termId: z.string().min(1, "Term is required"),
});

type BulkDownloadFormValues = z.infer<typeof bulkDownloadSchema>;

interface BulkDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkDownloadDialog({
  open,
  onOpenChange,
}: BulkDownloadDialogProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { classes, isLoading: classesLoading } = useClasses({ mode: "all" }, { page: 1, pageSize: 10 });
  const { terms, isLoading: termsLoading } = useTerms();
  const { reportCards, refetch } = useReportCards();

  const form = useForm<BulkDownloadFormValues>({
    resolver: zodResolver(bulkDownloadSchema),
    defaultValues: {
      classId: "",
      termId: "",
    },
  });

  const handleSubmit = async (data: BulkDownloadFormValues) => {
    try {
      setIsDownloading(true);
      setProgress(0);

      // Filter report cards for the selected class and term
      const filtered = reportCards.filter(
        (rc) => rc.classId === data.classId && rc.termId === data.termId
      );

      if (filtered.length === 0) {
        toast({
          title: "No Report Cards",
          description: "No report cards found for the selected class and term",
          variant: "destructive",
        });
        return;
      }

      const selectedClass = classes.find((c) => c.id === data.classId);

      const className = selectedClass?.name || "Class";
      const gradeName = (selectedClass as any)?.grade?.name || "Grade";

      // Fetch school name/logo the same way the single-download sheet does —
      // this was previously omitted here, so bulk PDFs silently had no logo.
      let schoolName: string | undefined;
      let logoUrl: string | undefined;
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch("/api/admin/settings/school-info", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const info = await res.json();
          if (info.settings) {
            if (typeof info.settings === "object" && !Array.isArray(info.settings)) {
              schoolName = info.settings.name;
            } else if (Array.isArray(info.settings)) {
              schoolName = info.settings.find((s: { key: string }) => s.key === "name")?.value;
            }
          }
          logoUrl = info.logoBase64 || undefined;
        }
      } catch {
        // Non-fatal — PDFs will just render without a logo/school name.
      }

      // Download all report cards as a single ZIP file
      await downloadClassReportCards(filtered, className, gradeName, setProgress, schoolName, logoUrl);

      toast({
        title: "Success",
        description: `Downloaded ${filtered.length} report cards as ZIP`,
      });

      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Bulk download error:", error);
      toast({
        title: "Error",
        description: "Failed to download report cards",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Download Report Cards</DialogTitle>
          <DialogDescription>
            Download all report cards for a specific class and term as a ZIP file
          </DialogDescription>
        </DialogHeader>

        {isDownloading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Generating PDFs...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <Select
                    disabled={isDownloading || classesLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.name} ({(classItem as any).grade?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the class to download report cards for
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="termId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Term</FormLabel>
                  <Select
                    disabled={isDownloading || termsLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a term" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {terms.map((term) => (
                        <SelectItem key={term.id} value={term.id}>
                          {term.termType} - {(term as any).academicYear?.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the term to download report cards for
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isDownloading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isDownloading}>
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating ZIP...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download ZIP
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
