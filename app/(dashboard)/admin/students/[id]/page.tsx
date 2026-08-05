"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  Heart,
  Users,
  Edit,
  FileText,
  Printer,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { StudentPerformanceRadar } from "@/components/teacher/student-performance-radar";
import { StudentSubjectPerformance } from "@/components/teacher/student-subject-performance";
import { ClassRankingCard } from "@/components/teacher/class-ranking-card";

interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  occupation: string | null;
  relationship: string;
  isPrimary: boolean;
}

interface Enrollment {
  id: string;
  status: string;
  enrollmentDate: string;
  class: {
    id: string;
    name: string;
    grade: {
      id: string;
      name: string;
    };
  };
  academicYear: {
    id: string;
    year: number;
  };
}

interface Student {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  studentNumber: string;
  gender: string;
  dateOfBirth: string;
  admissionDate: string;
  status: string;
  address: string | null;
  medicalInfo: string | null;
  vulnerability: string;
  enrollments?: Enrollment[];
  studentGuardians?: Array<{
    relationship: string;
    isPrimary: boolean;
    guardian: Guardian;
  }>;
}

interface SubjectScore {
  subject: string;
  score: number;
}

interface AssessmentScore {
  type: "CAT" | "MID" | "EOT";
  score: number;
  rank: number;
  total: number;
  trend: "up" | "down" | "same";
}

interface SubjectPerformanceData {
  subjectName: string;
  assessments: AssessmentScore[];
}

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const { toast } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<
    "CAT1" | "MID" | "EOT"
  >("CAT1");

  // Performance data states
  const [radarData, setRadarData] = useState<SubjectScore[]>([]);
  const [subjectPerformances, setSubjectPerformances] = useState<
    SubjectPerformanceData[]
  >([]);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [classPosition, setClassPosition] = useState<number | undefined>();
  const [classTotal, setClassTotal] = useState<number | undefined>();
  const [bestSix, setBestSix] = useState<number | undefined>();
  const [bestSixCount, setBestSixCount] = useState<number | undefined>();
  const [bestSixType, setBestSixType] = useState<
    "points" | "standard_points" | "percentage" | undefined
  >();
  const [generalInfoOpen, setGeneralInfoOpen] = useState(true);
  const [guardiansOpen, setGuardiansOpen] = useState(true);

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  useEffect(() => {
    if (student) {
      fetchPerformanceData();
    }
  }, [student, selectedAssessmentType]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/students/${studentId}?include=relations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch student");

      const result = await response.json();
      setStudent(result.data || result);
    } catch (error) {
      console.error("Error fetching student:", error);
      toast({
        title: "Error",
        description: "Failed to load student profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      setPerformanceLoading(true);
      const token = localStorage.getItem("auth_token");

      // Get current enrollment
      const currentEnrollment = student?.enrollments?.find(
        (e) => e.status === "ACTIVE"
      );
      if (!currentEnrollment) {
        setRadarData([]);
        setSubjectPerformances([]);
        return;
      }

      // Fetch assessment results for this student
      const response = await fetch(
        `/api/students/${studentId}/performance?classId=${currentEnrollment.class.id}&academicYearId=${currentEnrollment.academicYear.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = (await response.json()).data;

        // Set radar data based on selected assessment type
        if (data.radarData && data.radarData[selectedAssessmentType]) {
          setRadarData(data.radarData[selectedAssessmentType]);
        } else {
          setRadarData([]);
        }

        // Set subject performances
        if (data.subjectPerformances) {
          setSubjectPerformances(data.subjectPerformances);
        } else {
          setSubjectPerformances([]);
        }

        // Set statistics
        setClassPosition(data.classPosition);
        setClassTotal(data.classTotal);
        setBestSix(data.bestSix);
        setBestSixCount(data.bestSixCount);
        setBestSixType(data.bestSixType);
      } else {
        // API might not exist yet, use empty data
        setRadarData([]);
        setSubjectPerformances([]);
      }
    } catch (error) {
      console.error("Error fetching performance data:", error);
      // Don't show error toast - performance API might not be implemented yet
      setRadarData([]);
      setSubjectPerformances([]);
    } finally {
      setPerformanceLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-32" />
          <div className="text-right space-y-2">
            <Skeleton className="h-7 w-40 ml-auto" />
            <Skeleton className="h-4 w-48 ml-auto" />
          </div>
        </div>
        {/* Profile header card skeleton */}
        <div className="border rounded-lg p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Skeleton className="h-28 w-28 rounded-full mx-auto md:mx-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="space-y-2 min-w-[180px]">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        </div>
        {/* General information card skeleton */}
        <div className="border rounded-lg p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
        {/* Guardians card skeleton */}
        <div className="border rounded-lg p-6 space-y-4">
          <Skeleton className="h-6 w-36" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Student not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const fullName = `${student.firstName} ${
    student.middleName ? student.middleName + " " : ""
  }${student.lastName}`;
  const initials = `${student.firstName[0]}${student.lastName[0]}`;
  const age = Math.floor(
    (new Date().getTime() - new Date(student.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );

  const currentEnrollment = student.enrollments?.find(
    (e) => e.status === "ACTIVE"
  );
  const guardians =
    student.studentGuardians?.map((sg) => ({
      ...sg.guardian,
      relationship: sg.relationship,
      isPrimary: sg.isPrimary,
    })) || [];
  const primaryGuardian = guardians.find((g) => g.isPrimary) || guardians[0];

  const formatRelationship = (rel: string) => {
    return rel
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700";
      case "INACTIVE":
        return "bg-gray-100 text-gray-700";
      case "GRADUATED":
        return "bg-blue-100 text-blue-700";
      case "TRANSFERRED":
        return "bg-yellow-100 text-yellow-700";
      case "SUSPENDED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center w-full justify-between gap-3">
          <div>
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to class
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-end">Student Profile</h1>
            <p className="text-sm text-muted-foreground text-end">
              View student information
            </p>
          </div>
        </div>
        {/* <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Report Card
          </Button>
          <Button size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div> */}
      </div>

      {/* Student Header Card */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-28 w-28 mx-auto md:mx-0 border-4 border-background shadow-lg">
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left space-y-3">
              <div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                  <h2 className="text-3xl font-bold">{fullName}</h2>
                  <Badge
                    className={
                      getStatusColor(student.status) + " text-sm px-3 py-1"
                    }>
                    {student.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground font-mono text-sm">
                  {student.studentNumber}
                </p>
              </div>
              {currentEnrollment && (
                <div className="flex items-center justify-center md:justify-start gap-2 text-sm">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {currentEnrollment.class.grade.name} -{" "}
                    {currentEnrollment.class.name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {currentEnrollment.academicYear.year}
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{age} years old</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{student.gender === "MALE" ? "Male" : "Female"}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 min-w-[180px]">
              {primaryGuardian ? (
                <>
                  <div className="text-xs text-muted-foreground mb-1">
                    Primary Guardian
                  </div>
                  <p className="font-medium text-sm">
                    {primaryGuardian.firstName} {primaryGuardian.lastName}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled>
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                  {primaryGuardian.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        (window.location.href = `mailto:${primaryGuardian.email}`)
                      }>
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No guardian linked
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Information */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setGeneralInfoOpen((o) => !o)}>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <User className="h-5 w-5" />
              General Information
            </span>
            {generalInfoOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        {generalInfoOpen && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-xs text-muted-foreground">Gender</label>
                <p className="text-sm font-medium">
                  {student.gender === "MALE" ? "Male" : "Female"}
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Date of Birth
                </label>
                <p className="text-sm font-medium">
                  {format(new Date(student.dateOfBirth), "MMM dd, yyyy")}
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Age</label>
                <p className="text-sm font-medium">{age} years</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Admission Date
                </label>
                <p className="text-sm font-medium">
                  {format(new Date(student.admissionDate), "MMM dd, yyyy")}
                </p>
              </div>
              {student.address && (
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Address</label>
                  <p className="text-sm font-medium flex items-start gap-1">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    {student.address}
                  </p>
                </div>
              )}
              {student.medicalInfo && (
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">
                    Medical Information
                  </label>
                  <p className="text-sm font-medium flex items-start gap-1">
                    <Heart className="h-4 w-4 mt-0.5 text-red-500" />
                    {student.medicalInfo}
                  </p>
                </div>
              )}
              {student.vulnerability &&
                student.vulnerability !== "NOT_VULNERABLE" && (
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Vulnerability Status
                    </label>
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200">
                      {student.vulnerability.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Guardians */}
      {guardians.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setGuardiansOpen((o) => !o)}>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Guardians ({guardians.length})
              </span>
              {guardiansOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
          {guardiansOpen && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guardians.map((guardian) => (
                <div key={guardian.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {guardian.firstName[0]}
                        {guardian.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {guardian.firstName} {guardian.lastName}
                        </p>
                        {guardian.isPrimary && (
                          <Badge variant="secondary" className="text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatRelationship(guardian.relationship)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {guardian.phone}
                    </p>
                    {guardian.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {guardian.email}
                      </p>
                    )}
                    {guardian.occupation && (
                      <p className="text-muted-foreground">
                        Occupation: {guardian.occupation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          )}
        </Card>
      )}

      {/* Performance Section */}
      {currentEnrollment && (
        <>
          {/* Assessment Type Selector */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Academic Performance</h2>
            <Select
              value={selectedAssessmentType}
              onValueChange={(v) =>
                setSelectedAssessmentType(v as "CAT1" | "MID" | "EOT")
              }>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CAT1">CAT 1</SelectItem>
                <SelectItem value="MID">Mid-Term</SelectItem>
                <SelectItem value="EOT">End of Term</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Performance Charts - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <StudentPerformanceRadar
              studentId={studentId}
              assessmentType={selectedAssessmentType}
              data={radarData}
              classPosition={classPosition}
              classTotal={classTotal}
              bestSix={bestSix}
              bestSixCount={bestSixCount}
              bestSixType={bestSixType}
              loading={performanceLoading}
            />

            {/* Class Ranking Card */}
            <ClassRankingCard
              classPosition={classPosition}
              classTotal={classTotal}
              bestSix={bestSix}
              bestSixCount={bestSixCount}
              bestSixType={bestSixType}
              overallAverage={
                radarData.length > 0
                  ? Math.round(
                      radarData.reduce((sum, item) => sum + item.score, 0) /
                        radarData.length
                    )
                  : undefined
              }
              trend="same"
              subjectRankings={(() => {
                const examKey =
                  selectedAssessmentType === "CAT1" ? "CAT" : selectedAssessmentType;
                return subjectPerformances
                  .flatMap((sp) =>
                    sp.assessments
                      .filter((a) => a.type === examKey)
                      .map((a) => ({
                        subject: sp.subjectName,
                        score: a.score,
                        rank: a.rank,
                        total: a.total,
                      }))
                  )
                  .sort((a, b) => a.rank - b.rank);
              })()}
              loading={performanceLoading}
            />
          </div>

          {/* Subject Performance - Full Width */}
          {subjectPerformances.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-4">
                Subject Performance Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectPerformances.map((subjectData, index) => (
                  <StudentSubjectPerformance
                    key={index}
                    studentName={fullName}
                    subjectName={subjectData.subjectName}
                    assessments={subjectData.assessments}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* No Enrollment Message */}
      {!currentEnrollment && (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">
              Not Currently Enrolled
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              This student is not enrolled in any class for the current academic
              year.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
