"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface GenerationStats {
  totalAssignments: number;
  slotsGenerated: number;
  conflicts: number;
  successRate: number;
}

interface Conflict {
  className: string;
  subjectName: string;
  teacherName: string;
  reason: string;
}

interface GenerationResult {
  stats: GenerationStats;
  conflicts: Conflict[];
}

export default function TimetableGeneratePage() {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/timetable/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate timetable");
      }

      const data = await response.json();

      setResult({
        stats: data.stats,
        conflicts: data.conflicts || [],
      });

      if (data.stats.conflicts === 0) {
        toast.success("Timetable generated successfully with no conflicts!");
      } else {
        toast.warning(
          `Timetable generated with ${data.stats.conflicts} conflict${
            data.stats.conflicts !== 1 ? "s" : ""
          }`
        );
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generate Timetable</h1>
        <p className="text-muted-foreground">
          Generate a complete timetable based on your configuration and assignments
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timetable Generation</CardTitle>
          <CardDescription>
            This will create timetable slots for all classes based on subject-teacher
            assignments and your timetable configuration. Any existing timetable will be
            replaced.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Before generating the timetable, ensure you have:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Set up your timetable configuration (school timing, periods, etc.)</li>
                <li>Created and activated rooms/classrooms</li>
                <li>Assigned teachers to subjects for all classes</li>
                <li>Set an active academic year</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="pt-2">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              size="lg"
              className="w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating Timetable...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Timetable
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.stats.conflicts === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                Generation Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Assignments</p>
                  <p className="text-2xl font-bold">{result.stats.totalAssignments}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Slots Generated</p>
                  <p className="text-2xl font-bold text-green-600">
                    {result.stats.slotsGenerated}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Conflicts</p>
                  <p
                    className={`text-2xl font-bold ${
                      result.stats.conflicts === 0 ? "text-green-600" : "text-yellow-600"
                    }`}
                  >
                    {result.stats.conflicts}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {typeof result.stats.successRate === "number"
                      ? `${result.stats.successRate.toFixed(1)}%`
                      : "—"}
                  </p>
                </div>
              </div>

              {result.stats.conflicts === 0 && (
                <Alert className="mt-4 border-green-600 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-600">Perfect Generation!</AlertTitle>
                  <AlertDescription className="text-green-600">
                    All subject-teacher assignments have been successfully scheduled with
                    no conflicts.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Conflicts Card */}
          {result.conflicts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-yellow-600" />
                  Conflicts ({result.conflicts.length})
                </CardTitle>
                <CardDescription>
                  The following assignments could not be scheduled due to conflicts or
                  lack of available time slots. You may need to adjust your configuration
                  or assignments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.conflicts.map((conflict, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {conflict.className}
                        </TableCell>
                        <TableCell>{conflict.subjectName}</TableCell>
                        <TableCell>{conflict.teacherName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{conflict.reason}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>How to Resolve Conflicts</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Increase the number of periods per day in your configuration</li>
                      <li>Add more rooms to accommodate simultaneous classes</li>
                      <li>Reduce the number of subject assignments per teacher</li>
                      <li>Review and optimize your subject-teacher assignments</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
