"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Download, AlertCircle, CheckCircle2, X, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const REQUIRED_HEADERS = ["name", "code"];
const VALID_HEADERS = ["name", "code", "description"];

interface ImportResult {
  successful: number;
  failed: number;
  errors: Array<{ row: number; name?: string; error: string }>;
}

interface ImportSubjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function downloadTemplate() {
  const csv = "name,code,description\nMathematics,MATH,Core mathematics subject\nEnglish,ENG,English language and literature\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "subjects_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportSubjectsDialog({ open, onOpenChange, onSuccess }: ImportSubjectsDialogProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    setResult(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const processFile = useCallback((f: File) => {
    if (f.size > 5 * 1024 * 1024) { setParseError("File too large (max 5 MB)"); return; }
    setFile(f);
    setParseError(null);
    setResult(null);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const headers = (res.meta.fields ?? []).map((h) => h.trim());
        const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
        if (missing.length) { setParseError(`Missing required columns: ${missing.join(", ")}`); setParsedRows([]); return; }
        if (res.data.length === 0) { setParseError("CSV file contains no data rows"); setParsedRows([]); return; }
        if (res.data.length > 200) { setParseError("Maximum 200 rows per import"); setParsedRows([]); return; }
        setParsedRows(res.data as any[]);
      },
      error: (err) => { setParseError(`Parse error: ${err.message}`); setParsedRows([]); },
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) processFile(f);
    else setParseError("Only .csv files are accepted");
  }, [processFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleImport = async () => {
    if (!parsedRows.length) return;
    setImporting(true);
    try {
      const token = localStorage.getItem("auth_token") ?? "";
      const rows = parsedRows.map((r) => ({
        name: r.name?.trim(),
        code: r.code?.trim(),
        description: r.description?.trim() || undefined,
      }));
      const res = await fetch("/api/subjects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Import failed", description: data.error, variant: "destructive" }); return; }
      setResult(data.data);
      if (data.data.successful > 0) {
        toast({ title: "Import complete", description: `${data.data.successful} subjects imported` });
        onSuccess?.();
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Import Subjects</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk-import subjects. Required columns:{" "}
            <span className="font-mono text-xs">name</span>,{" "}
            <span className="font-mono text-xs">code</span>. Optional:{" "}
            <span className="font-mono text-xs">description</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Template download */}
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 text-xs">
            <Download className="h-3.5 w-3.5" />
            Download Template
          </Button>

          {/* Drop zone */}
          {!result && (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById("subject-csv-input")?.click()}>
              <input id="subject-csv-input" type="file" accept=".csv" className="hidden" onChange={onFileChange} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{file.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); reset(); }} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Drag & drop a CSV file, or click to browse
                </p>
              )}
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {parseError}
            </div>
          )}

          {/* Preview row count */}
          {parsedRows.length > 0 && !result && (
            <p className="text-sm text-muted-foreground">
              {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""} ready to import
            </p>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className={cn("flex items-center gap-2 p-3 rounded-lg border", result.failed === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200")}>
                {result.failed === 0
                  ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  : <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />}
                <div className="text-sm space-y-0.5">
                  {result.successful > 0 && <p className="font-medium text-green-700">{result.successful} subject{result.successful !== 1 ? "s" : ""} imported</p>}
                  {result.failed > 0 && <p className="text-amber-700">{result.failed} row{result.failed !== 1 ? "s" : ""} failed</p>}
                </div>
              </div>
              {result.errors.length > 0 && (
                <ScrollArea className="h-36 rounded-lg border">
                  <div className="p-2 space-y-1">
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-xs flex gap-2 text-destructive px-2 py-1">
                        <span className="shrink-0 font-mono">Row {e.row}</span>
                        <span>{e.name ? `"${e.name}" — ` : ""}{e.error}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => handleClose(false)}>
              {result ? "Close" : "Cancel"}
            </Button>
            {!result && (
              <Button onClick={handleImport} disabled={!parsedRows.length || importing}>
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import {parsedRows.length > 0 ? `${parsedRows.length} Subjects` : ""}
              </Button>
            )}
            {result && result.failed > 0 && (
              <Button onClick={reset}>Import Again</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
