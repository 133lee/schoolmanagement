"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCompactClassLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Student Attendance History Page
 * View attendance history for a specific student
 */

interface Student {
  firstName: string;
  lastName: string;
  studentNumber: string;
}

interface Term {
  id: string;
  termType: string;
  academicYear: {
    year: number;
  };
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks: string | null;
  class: {
    name: string;
    grade: {
      name: string;
    };
  };
}

interface Stats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
  absenteeRate: number;
}

export default function StudentAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const { toast } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudent();
    fetchTerms();
  }, [studentId]);

  useEffect(() => {
    if (selectedTermId) {
      fetchAttendance();
      fetchStats();
    }
  }, [selectedTermId]);

  const fetchStudent = async () => {
    try {
      const response = await fetch(`/api/students/${studentId}`);
      if (response.ok) {
        const data = await response.json();
        setStudent(data);
      }
    } catch (error) {
      console.error("Error fetching student:", error);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await fetch("/api/terms");
      if (response.ok) {
        const data = await response.json();
        setTerms(data.data || []);
        const activeTerm = data.data.find((t: any) => t.isActive);
        if (activeTerm) {
          setSelectedTermId(activeTerm.id);
        }
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/attendance/student/${studentId}?termId=${selectedTermId}`
      );
      if (response.ok) {
        const data = await response.json();
        setRecords(data.data);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `/api/attendance/student/${studentId}/stats?termId=${selectedTermId}`
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      PRESENT: "bg-green-500",
      ABSENT: "bg-red-500",
      LATE: "bg-yellow-500",
      EXCUSED: "bg-blue-500",
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-gray-500"}>
        {status}
      </Badge>
    );
  };

  if (loading && !student) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Attendance History</h1>
          {student && (
            <p className="text-muted-foreground">
              {student.firstName} {student.lastName} ({student.studentNumber})
            </p>
          )}
        </div>
        <Select value={selectedTermId} onValueChange={setSelectedTermId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select term" />
          </SelectTrigger>
          <SelectContent>
            {terms.map((term) => (
              <SelectItem key={term.id} value={term.id}>
                {term.academicYear.year} - {term.termType.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statistics */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Present</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.present}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Absent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats.absent}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Late</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.late}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Excused</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.excused}
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
                  {stats.attendanceRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records ({records.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Loading records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records for this term</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {new Date(record.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      {getStatusBadge(record.status)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Class: {formatCompactClassLabel(record.class.grade.name, record.class.name)}
                    </div>
                    {record.remarks && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Remarks: {record.remarks}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
