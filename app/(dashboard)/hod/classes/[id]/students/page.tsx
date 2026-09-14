"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/shared/stats-card";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ChevronLeft, Search, Users, UserCheck, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  studentNumber: string;
  gender?: string;
}

interface Enrollment {
  id: string;
  student: Student;
  status: string;
  enrollmentDate: string;
}

interface ClassData {
  id: string;
  name: string;
  capacity: number;
  grade: { id: string; name: string };
}

export default function HodClassStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const { toast } = useToast();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYearId, setAcademicYearId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("auth_token");
        const headers = { Authorization: `Bearer ${token}` };

        const [classRes, yearRes] = await Promise.all([
          fetch(`/api/classes/${classId}?include=relations`, { headers }),
          fetch("/api/academic-years/active", { headers }),
        ]);

        const classJson = await classRes.json();
        if (classJson.success) setClassData(classJson.data);

        const yearJson = await yearRes.json();
        const yearId = yearJson?.data?.id ?? yearJson?.id ?? "";
        setAcademicYearId(yearId);

        if (yearId) {
          const studRes = await fetch(
            `/api/classes/${classId}/students?academicYearId=${yearId}`,
            { headers }
          );
          const studJson = await studRes.json();
          const raw = studJson.data;
          setEnrollments(Array.isArray(raw) ? raw : (raw?.enrollments ?? studJson.enrollments ?? []));
        }
      } catch {
        toast({ title: "Failed to load students", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [classId]);

  const filtered = useMemo(() => {
    return enrollments.filter((e) => {
      const name = `${e.student.firstName} ${e.student.lastName} ${e.student.studentNumber}`.toLowerCase();
      const matchSearch = !searchQuery || name.includes(searchQuery.toLowerCase());
      const matchGender =
        genderFilter === "all" ||
        (e.student.gender ?? "").toUpperCase() === genderFilter.toUpperCase();
      return matchSearch && matchGender;
    });
  }, [enrollments, searchQuery, genderFilter]);

  const active = enrollments.filter((e) => e.status === "ACTIVE").length;
  const male = enrollments.filter((e) => (e.student.gender ?? "").toUpperCase() === "MALE").length;
  const female = enrollments.filter((e) => (e.student.gender ?? "").toUpperCase() === "FEMALE").length;

  if (loading) {
    return (
      <div className="space-y-6 px-4 lg:px-0">
        <div className="flex items-start justify-between mt-2">
          <Skeleton className="h-9 w-20" />
          <div className="text-right space-y-1">
            <Skeleton className="h-5 w-40 ml-auto" />
            <Skeleton className="h-3.5 w-56 ml-auto" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 lg:px-0">
      {/* Header */}
      <div className="flex items-start justify-between mt-2">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="text-right">
          <h1 className="text-xl font-bold">{classData?.name ?? "Class"} — Students</h1>
          <p className="text-sm text-muted-foreground">
            {enrollments.length} student{enrollments.length !== 1 ? "s" : ""} enrolled
            {classData?.capacity ? ` · Capacity: ${classData.capacity}` : ""}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard label="Total Enrolled" value={enrollments.length} icon={Users} variant="primary" subtitle="All records" />
        <StatsCard label="Active" value={active} icon={UserCheck} variant="success" subtitle={`${enrollments.length ? Math.round((active / enrollments.length) * 100) : 0}% of class`} />
        <StatsCard label="Male" value={male} icon={User} variant="info" subtitle={`${enrollments.length ? Math.round((male / enrollments.length) * 100) : 0}% of class`} />
        <StatsCard label="Female" value={female} icon={User} variant="warning" subtitle={`${enrollments.length ? Math.round((female / enrollments.length) * 100) : 0}% of class`} />
      </div>

      {/* Table */}
      <Card className="flex flex-col">
        <CardHeader className="pb-0">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or student number..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <Empty className="h-64">
              <EmptyContent>
                <EmptyMedia variant="icon"><Users className="h-6 w-6" /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No students found</EmptyTitle>
                  <EmptyDescription>
                    {searchQuery || genderFilter !== "all"
                      ? "Try adjusting your filters"
                      : "No students are enrolled in this class"}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              {/* ── Mobile: compact rows — no avatar bubble, Student No.
                  and Enrolled dropped, Gender shown as a single M/F
                  initial to keep the row short. ───────────────────── */}
              <div className="lg:hidden rounded-md border divide-y overflow-hidden">
                {filtered.map((e) => {
                  const name = `${e.student.firstName} ${e.student.lastName}`;
                  const isActive = e.status === "ACTIVE";
                  const genderInitial = e.student.gender ? e.student.gender.charAt(0) : "—";
                  return (
                    <div key={e.id} className="flex items-center gap-3 p-3">
                      <p className="flex-1 min-w-0 font-medium text-sm truncate">{name}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{genderInitial}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 shrink-0",
                          isActive
                            ? "border-green-300 text-green-700 dark:text-green-400"
                            : "border-muted text-muted-foreground"
                        )}>
                        {e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                      </Badge>
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop: full table — unchanged ─────────────────── */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Student No.</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enrolled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e, idx) => {
                      const name = `${e.student.firstName} ${e.student.lastName}`;
                      const initials = `${e.student.firstName[0]}${e.student.lastName[0]}`;
                      const isActive = e.status === "ACTIVE";
                      return (
                        <TableRow key={e.id} className={idx % 2 === 1 ? "bg-muted/30" : undefined}>
                          <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground tabular-nums">
                            {e.student.studentNumber}
                          </TableCell>
                          <TableCell className="text-sm">
                            {e.student.gender
                              ? e.student.gender.charAt(0) + e.student.gender.slice(1).toLowerCase()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                isActive
                                  ? "border-green-300 text-green-700 dark:text-green-400"
                                  : "border-muted text-muted-foreground"
                              }>
                              {e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(e.enrollmentDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
