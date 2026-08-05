"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    studentNumber?: string;
    error: string;
  }>;
}

// Valid CSV headers - studentNumber is optional (auto-generated if not provided)
const VALID_HEADERS = [
  "firstName",
  "middleName",
  "lastName",
  "gender",
  "dateOfBirth",
  "admissionDate",
  "studentNumber",
  "status",
  "address",
  "medicalInfo",
  "vulnerability",
];

// Required headers that must be present in CSV
const REQUIRED_HEADERS = [
  "firstName",
  "lastName",
  "gender",
  "dateOfBirth",
  "admissionDate",
];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Template URL - served from public folder
const TEMPLATE_URL = "/templates/student_import_template.csv";

export function ImportStudentsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportStudentsDialogProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setFile(null);
    setImportResult(null);
    setParseError(null);
    setIsDragging(false);
  }, []);

  // Handle dialog open/close properly
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        resetState();
      }
      onOpenChange(isOpen);
    },
    [resetState, onOpenChange]
  );

  // Normalize header names (case-insensitive matching)
  const normalizeHeader = (header: string): string => {
    const trimmed = header.trim();
    const match = VALID_HEADERS.find(
      (valid) => valid.toLowerCase() === trimmed.toLowerCase()
    );
    return match || trimmed;
  };

  // Validate CSV headers
  const validateHeaders = (headers: string[]): void => {
    const normalizedHeaders = headers.map(normalizeHeader);

    // Check for required headers
    const missingRequired = REQUIRED_HEADERS.filter(
      (required) =>
        !normalizedHeaders.some(
          (h) => h.toLowerCase() === required.toLowerCase()
        )
    );

    if (missingRequired.length > 0) {
      throw new Error(`Missing required columns: ${missingRequired.join(", ")}`);
    }

    // Check for invalid headers
    const invalidHeaders = normalizedHeaders.filter(
      (h) => !VALID_HEADERS.some((valid) => valid.toLowerCase() === h.toLowerCase())
    );

    if (invalidHeaders.length > 0) {
      throw new Error(`Invalid columns: ${invalidHeaders.join(", ")}. Valid columns are: ${VALID_HEADERS.join(", ")}`);
    }
  };

  // Parse CSV using PapaParse
  const parseCSV = (text: string): Record<string, string>[] => {
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
    });

    if (result.errors.length > 0) {
      const firstError = result.errors[0];
      throw new Error(`CSV parsing error at row ${firstError.row}: ${firstError.message}`);
    }

    if (!result.meta.fields || result.meta.fields.length === 0) {
      throw new Error("CSV file has no headers");
    }

    if (result.data.length === 0) {
      throw new Error("CSV file has no data rows");
    }

    // Validate headers
    validateHeaders(result.meta.fields);

    return result.data as Record<string, string>[];
  };

  // Validate file before accepting
  const validateFile = (selectedFile: File): string | null => {
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      return "Please upload a CSV file";
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      return `File must be under ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    if (selectedFile.size === 0) {
      return "File is empty";
    }

    return null;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  }, [isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isUploading) return;

      setParseError(null);
      const droppedFile = e.dataTransfer.files[0];

      if (droppedFile) {
        const error = validateFile(droppedFile);
        if (error) {
          setParseError(error);
          return;
        }
        setFile(droppedFile);
        setImportResult(null);
      }
    },
    [isUploading]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isUploading) return;

      setParseError(null);
      const selectedFile = e.target.files?.[0];

      if (selectedFile) {
        const error = validateFile(selectedFile);
        if (error) {
          setParseError(error);
          return;
        }
        setFile(selectedFile);
        setImportResult(null);
      }

      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [isUploading]
  );

  const handleImport = async () => {
    if (!file || isUploading) return;

    setIsUploading(true);
    setParseError(null);

    try {
      // Read and parse CSV file
      const text = await file.text();
      const rows = parseCSV(text);

      // Send to API
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      const response = await fetch("/api/students/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rows }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Import failed (${response.status})`);
      }

      // Validate API response shape
      if (
        !result?.data ||
        typeof result.data.successful !== "number" ||
        typeof result.data.failed !== "number" ||
        !Array.isArray(result.data.errors)
      ) {
        throw new Error("Invalid server response format");
      }

      setImportResult(result.data);

      if (result.data.successful > 0) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${result.data.successful} student(s)${
            result.data.failed > 0 ? `. ${result.data.failed} failed.` : ""
          }`,
        });

        if (result.data.failed === 0) {
          onSuccess?.();
        }
      } else {
        toast({
          title: "Import Failed",
          description: "No students were imported. Check the errors below.",
          variant: "destructive",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed";
      setParseError(message);
      toast({
        title: "Import Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Students</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import students into the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="text-sm">
              <p className="font-medium">Need a template?</p>
              <p className="text-muted-foreground">
                Download our CSV template with all columns
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={TEMPLATE_URL} download="student_import_template.csv">
                <Download className="h-4 w-4 mr-2" />
                Template
              </a>
            </Button>
          </div>

          {/* Drop Zone */}
          {!importResult && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50",
                file && "border-green-500 bg-green-50 dark:bg-green-950/20",
                isUploading && "pointer-events-none opacity-50"
              )}>
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-10 w-10 text-green-600" />
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={isUploading}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setParseError(null);
                      }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Drop your CSV file here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                </div>
              )}
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="text-sm">{parseError}</p>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">
                    {importResult.successful} imported
                  </span>
                </div>
                {importResult.failed > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">
                      {importResult.failed} failed
                    </span>
                  </div>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="border rounded-lg">
                  <div className="p-2 bg-muted/50 border-b">
                    <p className="text-sm font-medium">Errors</p>
                  </div>
                  <ScrollArea className="h-[150px]">
                    <div className="p-2 space-y-1">
                      {importResult.errors.map((error, index) => (
                        <div
                          key={index}
                          className="text-sm p-2 bg-destructive/5 rounded">
                          <span className="font-medium">Row {error.row}</span>
                          {error.studentNumber && (
                            <span className="text-muted-foreground">
                              {" "}
                              ({error.studentNumber})
                            </span>
                          )}
                          <span className="text-destructive">
                            : {error.error}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Required Fields Info */}
          {!importResult && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Required columns:</p>
              <p>
                firstName, lastName, gender (MALE/FEMALE), dateOfBirth
                (YYYY-MM-DD), admissionDate (YYYY-MM-DD)
              </p>
              <p className="font-medium mt-2">Optional columns:</p>
              <p>
                middleName, studentNumber (auto-generated if empty), status
                (ACTIVE/SUSPENDED/etc), address, medicalInfo, vulnerability
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {importResult ? (
            <>
              <Button variant="outline" onClick={resetState}>
                Import More
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!file || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
