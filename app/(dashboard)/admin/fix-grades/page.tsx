"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

/**
 * Admin Grade Fix Page
 * Allows administrators to recalculate and fix incorrect grades
 */

interface FixResult {
  success: boolean;
  message: string;
  summary: {
    totalChecked: number;
    updated: number;
    unchanged: number;
    errors: number;
  };
  updates: Array<{
    studentId: string;
    assessmentType: string;
    subject: string;
    oldGrade: string;
    newGrade: string;
    percentage: string;
  }>;
  errors: Array<{
    resultId: string;
    error: string;
  }>;
}

export default function FixGradesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFixGrades = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/fix-grades", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fix grades");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Fix Grade Calculations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recalculate and fix grades that were calculated using the wrong grading scale
        </p>
      </div>

      {/* Warning Card */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Administrator Action Required</AlertTitle>
        <AlertDescription>
          This tool will recalculate all assessment grades using the correct grading scale
          (JUNIOR for Grades 8-9, SENIOR for Grades 10-12). This action will update the database
          and cannot be undone. Please ensure you have a database backup before proceeding.
        </AlertDescription>
      </Alert>

      {/* Action Card */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Recalculation</CardTitle>
          <CardDescription>
            Click the button below to scan all assessment results and fix any grades that were
            calculated using the wrong grading scale.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleFixGrades}
            disabled={loading}
            size="lg"
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fixing Grades...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Fix Grades Now
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Card */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Results
            </CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Checked</p>
                <p className="text-2xl font-bold">{result.summary.totalChecked}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="text-2xl font-bold text-green-600">{result.summary.updated}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Unchanged</p>
                <p className="text-2xl font-bold text-blue-600">{result.summary.unchanged}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-600">{result.summary.errors}</p>
              </div>
            </div>

            {/* Updated Grades */}
            {result.updates.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Updated Grades ({result.updates.length})</h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {result.updates.map((update, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg text-sm"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {update.assessmentType} - {update.percentage}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Student: {update.studentId.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{update.oldGrade}</Badge>
                        <span>→</span>
                        <Badge variant="default">{update.newGrade}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-red-600">Errors ({result.errors.length})</h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {result.errors.map((err, index) => (
                    <div
                      key={index}
                      className="p-3 border border-red-200 rounded-lg text-sm bg-red-50"
                    >
                      <p className="font-medium">Result ID: {err.resultId}</p>
                      <p className="text-xs text-red-600">{err.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
