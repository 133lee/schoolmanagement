"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

/**
 * Attendance Reports Page
 * Generate attendance reports for classes
 */

interface Class {
  id: string;
  name: string;
  section?: string;
  grade: {
    name: string;
  };
}

interface Summary {
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export default function AttendanceReportsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();

    // Set default dates (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await api.get("/classes");
      const classesArray = response.data?.data || response.data || response;
      if (Array.isArray(classesArray)) {
        setClasses(classesArray);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedClassId || !startDate || !endDate) {
      toast({
        title: "Validation Error",
        description: "Please select class and date range",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const data = await api.get(
        `/attendance/reports?classId=${selectedClassId}&startDate=${startDate}&endDate=${endDate}`
      );

      // Handle response - could be { data: summary } or summary directly
      const summaryData = data.data || data;
      setSummary(summaryData);

      toast({
        title: "Success",
        description: "Report generated successfully",
      });
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance Reports</h1>
        <p className="text-muted-foreground">
          Generate attendance reports for classes
        </p>
      </div>

      {/* Report Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Class</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name} ({classItem.grade?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={handleGenerateReport} disabled={loading}>
              <FileText className="mr-2 h-4 w-4" />
              {loading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      {summary && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Attendance Summary
                  {selectedClass && (
                    <span className="text-base font-normal text-muted-foreground ml-2">
                      - {selectedClass.name} ({selectedClass.grade?.name})
                    </span>
                  )}
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export to CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date Range:</span>
                  </div>
                  <div className="font-medium">
                    {new Date(summary.dateRange.start).toLocaleDateString()} -{" "}
                    {new Date(summary.dateRange.end).toLocaleDateString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        Total Records
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {summary.totalRecords}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        Present
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {summary.present}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        Absent
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {summary.absent}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        Late
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">
                        {summary.late}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        Attendance Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {summary.attendanceRate.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Visual Progress Bar */}
                <div className="pt-4">
                  <p className="text-sm font-medium mb-2">Distribution</p>
                  <div className="h-8 flex rounded-lg overflow-hidden">
                    {summary.present > 0 && (
                      <div
                        className="bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                        style={{
                          width: `${
                            (summary.present / summary.totalRecords) * 100
                          }%`,
                        }}
                      >
                        {summary.present > 0 && summary.present}
                      </div>
                    )}
                    {summary.late > 0 && (
                      <div
                        className="bg-yellow-500 flex items-center justify-center text-xs text-white font-medium"
                        style={{
                          width: `${
                            (summary.late / summary.totalRecords) * 100
                          }%`,
                        }}
                      >
                        {summary.late > 0 && summary.late}
                      </div>
                    )}
                    {summary.excused > 0 && (
                      <div
                        className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium"
                        style={{
                          width: `${
                            (summary.excused / summary.totalRecords) * 100
                          }%`,
                        }}
                      >
                        {summary.excused > 0 && summary.excused}
                      </div>
                    )}
                    {summary.absent > 0 && (
                      <div
                        className="bg-red-500 flex items-center justify-center text-xs text-white font-medium"
                        style={{
                          width: `${
                            (summary.absent / summary.totalRecords) * 100
                          }%`,
                        }}
                      >
                        {summary.absent > 0 && summary.absent}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>TODO: Additional Features</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li>CSV/Excel export functionality</li>
                <li>PDF report generation</li>
                <li>Individual student attendance breakdown</li>
                <li>Trend analysis and charts</li>
                <li>Compare multiple classes</li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {!summary && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Generate a report to see attendance statistics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
