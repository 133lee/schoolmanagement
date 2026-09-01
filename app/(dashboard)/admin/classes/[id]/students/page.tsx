"use client";

import { useState, useEffect, useMemo } from "react";
import { formatClassLabel, formatCompactClassLabel } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Users,
  Search,
  MoreVertical,
  UserMinus,
  ArrowRightLeft,
  Loader2,
  TrendingUp,
  UserCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { StatsCard } from "@/components/shared/stats-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Class Students Management Page
 * View and manage students enrolled in a specific class with advanced features:
 * - Search and filter students
 * - Transfer students to another class
 * - Withdraw students from class
 * - View enrollment statistics
 * - Bulk actions
 */

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
  grade: {
    id: string;
    name: string;
  };
}

interface TransferClass {
  id: string;
  name: string;
  grade: {
    name: string;
  };
  capacity: number;
  _count?: {
    enrollments: number;
  };
}

export default function ClassStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const { toast } = useToast();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYearId, setAcademicYearId] = useState("");

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);

  // Transfer state
  const [availableClasses, setAvailableClasses] = useState<TransferClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [transferReason, setTransferReason] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch active academic year
  useEffect(() => {
    const fetchActiveYear = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch("/api/academic-years/active", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setAcademicYearId(data.data.id);
        }
      } catch (error) {
        console.error("Error fetching active year:", error);
      }
    };
    fetchActiveYear();
  }, []);

  // Fetch class data
  useEffect(() => {
    const fetchClass = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`/api/classes/${classId}?include=relations`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setClassData(result.data);
        }
      } catch (error) {
        console.error("Error fetching class:", error);
      }
    };
    fetchClass();
  }, [classId]);

  // Fetch class students
  useEffect(() => {
    if (academicYearId) {
      fetchStudents();
    }
  }, [academicYearId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/classes/${classId}/students?academicYearId=${academicYearId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch");

      const result = await response.json();

      // Handle different response formats
      const enrollmentsData = Array.isArray(result)
        ? result
        : result.data || result.enrollments || [];

      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch available classes for transfer
  const fetchAvailableClasses = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/classes?includeEnrollmentCount=true", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        const classes = result.data || [];
        // Exclude current class
        setAvailableClasses(classes.filter((c: TransferClass) => c.id !== classId));
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  // Filtered and searched enrollments
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((enrollment) => {
      // Search filter
      if (searchQuery) {
        const fullName = `${enrollment.student.firstName} ${enrollment.student.middleName || ""} ${enrollment.student.lastName}`.toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        if (
          !fullName.includes(searchLower) &&
          !enrollment.student.studentNumber.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all" && enrollment.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [enrollments, searchQuery, statusFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = enrollments.length;
    const active = enrollments.filter((e) => e.status === "ACTIVE").length;
    const withdrawn = enrollments.filter((e) => e.status === "WITHDRAWN").length;
    const transferred = enrollments.filter((e) => e.status === "TRANSFERRED").length;
    const capacity = classData?.capacity || 0;
    const utilizationRate = capacity > 0 ? Math.round((total / capacity) * 100) : 0;

    return { total, active, withdrawn, transferred, capacity, utilizationRate };
  }, [enrollments, classData]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredEnrollments.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedEnrollments = filteredEnrollments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleTransferClick = async (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setTransferDialogOpen(true);
    await fetchAvailableClasses();
  };

  const handleWithdrawClick = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setWithdrawDialogOpen(true);
  };

  const handleTransferSubmit = async () => {
    if (!selectedEnrollment || !selectedClassId) {
      toast({
        title: "Validation Error",
        description: "Please select a class to transfer to",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsTransferring(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/enrollments/${selectedEnrollment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: selectedClassId,
          changeReason: transferReason || "Transfer to another class",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to transfer");
      }

      toast({
        title: "Success",
        description: `Student transferred successfully`,
      });

      // Refresh the list
      await fetchStudents();
      setTransferDialogOpen(false);
      setSelectedEnrollment(null);
      setSelectedClassId("");
      setTransferReason("");
    } catch (error: any) {
      console.error("Error transferring student:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to transfer student",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleWithdrawSubmit = async () => {
    if (!selectedEnrollment) return;

    try {
      setIsWithdrawing(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/enrollments/${selectedEnrollment.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to withdraw");
      }

      toast({
        title: "Success",
        description: `Student withdrawn from class`,
      });

      // Refresh the list
      await fetchStudents();
      setWithdrawDialogOpen(false);
      setSelectedEnrollment(null);
    } catch (error: any) {
      console.error("Error withdrawing student:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to withdraw student",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getStudentFullName = (student: Student) => {
    return `${student.firstName} ${student.middleName ? student.middleName + " " : ""}${student.lastName}`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "WITHDRAWN":
        return "destructive";
      case "TRANSFERRED":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Skeleton className="h-9 w-20" /><Skeleton className="h-7 w-48" /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <Card key={i}><CardContent className="pt-5 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-12" /></CardContent></Card>)}
        </div>
        <Card><CardContent className="pt-5 space-y-3">
          {Array.from({ length: 10 }).map((_, i) => {
            const ws = ["w-40","w-32","w-36","w-44","w-28","w-40","w-32","w-36","w-28","w-44"];
            return (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className={`h-4 ${ws[i]}`} />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full ml-auto" />
              </div>
            );
          })}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/classes")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Classes
          </Button>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold">Class Students</h1>
          <p className="text-sm text-muted-foreground">
            {classData ? formatClassLabel(classData.grade.name, classData.name) : "Manage student enrollment"}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          label="Total Enrolled"
          value={`${stats.total} / ${stats.capacity}`}
          icon={Users}
          variant="primary"
        />
        <StatsCard
          label="Active Students"
          value={stats.active}
          icon={UserCheck}
          variant="success"
        />
        <StatsCard
          label="Capacity Utilization"
          value={`${stats.utilizationRate}%`}
          icon={TrendingUp}
          variant="info"
        />
        <StatsCard
          label="Withdrawn/Transferred"
          value={stats.withdrawn + stats.transferred}
          icon={UserMinus}
          variant="warning"
        />
      </div>

      {/* Search and Filter Card */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or student number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                  <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => router.push(`/admin/classes/${classId}/enroll`)}>
              <Plus className="mr-2 h-4 w-4" />
              Enroll Students
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Enrolled Students ({filteredEnrollments.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEnrollments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {searchQuery || statusFilter !== "all" ? "No students match your filters" : "No students enrolled yet"}
              </p>
              <p className="text-sm mt-1">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Click 'Enroll Students' to add students to this class"}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Student Number</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Enrollment Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEnrollments.map((enrollment) => {
                      const fullName = getStudentFullName(enrollment.student);
                      const initials = `${enrollment.student.firstName[0]}${enrollment.student.lastName[0]}`;

                      return (
                        <TableRow
                          key={enrollment.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/admin/students/${enrollment.student.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{fullName}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{enrollment.student.studentNumber}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm capitalize">
                              {enrollment.student.gender?.toLowerCase() || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <CalendarDays className="h-3 w-3 text-muted-foreground" />
                              <span>{new Date(enrollment.enrollmentDate).toLocaleDateString()}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(enrollment.status)}>
                              {enrollment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/admin/students/${enrollment.student.id}`);
                                  }}
                                >
                                  View Student Profile
                                </DropdownMenuItem>
                                {enrollment.status === "ACTIVE" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTransferClick(enrollment);
                                      }}
                                    >
                                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                                      Transfer to Another Class
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleWithdrawClick(enrollment);
                                      }}
                                      className="text-destructive"
                                    >
                                      <UserMinus className="mr-2 h-4 w-4" />
                                      Withdraw from Class
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredEnrollments.length)} of{" "}
                      {filteredEnrollments.length}
                    </span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>per page</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-3 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transfer Student</DialogTitle>
            <DialogDescription>
              Transfer{" "}
              {selectedEnrollment
                ? getStudentFullName(selectedEnrollment.student)
                : "student"}{" "}
              to another class
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select New Class</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((cls) => {
                    const enrolled = cls._count?.enrollments || 0;
                    const isFull = enrolled >= cls.capacity;
                    return (
                      <SelectItem key={cls.id} value={cls.id} disabled={isFull}>
                        <div className="flex items-center justify-between w-full">
                          <span>
                            {formatCompactClassLabel(cls.grade.name, cls.name)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({enrolled}/{cls.capacity})
                            {isFull && " - Full"}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Transfer (Optional)</label>
              <Input
                placeholder="e.g., Parent request, academic reasons..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferDialogOpen(false)}
              disabled={isTransferring}
            >
              Cancel
            </Button>
            <Button onClick={handleTransferSubmit} disabled={isTransferring || !selectedClassId}>
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer Student
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Student?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw{" "}
              <span className="font-semibold">
                {selectedEnrollment ? getStudentFullName(selectedEnrollment.student) : "this student"}
              </span>{" "}
              from this class? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isWithdrawing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdrawSubmit}
              disabled={isWithdrawing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                "Withdraw Student"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
