"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ParentRelationship, Gender, StudentStatus } from "@/types/prisma-enums";
import { ChevronLeft, Search, Users, UserCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { useStudents } from "@/hooks/useStudents";
import { useParents } from "@/hooks/useParents";
import { useToast } from "@/hooks/use-toast";

// Form validation schema
const linkGuardianSchema = z.object({
  studentIds: z.array(z.string()).min(1, "Please select at least one student"),
  guardianId: z.string().min(1, "Please select a guardian"),
  relationship: z.nativeEnum(ParentRelationship),
  isPrimary: z.boolean(),
});

type LinkGuardianFormValues = z.infer<typeof linkGuardianSchema>;

export default function LinkStudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const preSelectedGuardianId = searchParams.get("guardianId");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [studentSearch, setStudentSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<Gender | "all">("all");
  const [guardianSearch, setGuardianSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoize filter and pagination objects
  const studentFilters = useMemo(
    () => ({
      search: studentSearch || undefined,
      gender: genderFilter !== "all" ? genderFilter : undefined,
    }),
    [studentSearch, genderFilter]
  );
  const studentPagination = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const guardianFilters = useMemo(() => ({ search: guardianSearch }), [guardianSearch]);
  const guardianPagination = useMemo(() => ({ page: 1, pageSize: 50 }), []);

  const { students, meta, isLoading: studentsLoading } = useStudents(studentFilters, studentPagination);
  const { parents } = useParents(guardianFilters, guardianPagination);

  const form = useForm<LinkGuardianFormValues>({
    resolver: zodResolver(linkGuardianSchema),
    defaultValues: {
      studentIds: [],
      guardianId: preSelectedGuardianId || "",
      relationship: undefined,
      isPrimary: false,
    },
  });

  const selectedStudentIds = form.watch("studentIds");

  const handleSubmit = async (data: LinkGuardianFormValues) => {
    try {
      setIsSubmitting(true);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Authentication required");
      }

      // Link each student to the guardian
      const linkPromises = data.studentIds.map(async (studentId) => {
        const response = await fetch(`/api/parents/${data.guardianId}/students`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            studentId,
            relationship: data.relationship,
            isPrimary: data.isPrimary,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `Failed to link student ${studentId}`);
        }

        return result;
      });

      await Promise.all(linkPromises);

      toast({
        title: "Success",
        description: `${data.studentIds.length} student(s) linked to guardian successfully`,
      });

      router.push("/admin/parents");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to link student(s)",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    const current = form.getValues("studentIds");
    const newValue = current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId];
    form.setValue("studentIds", newValue);
  };

  const toggleAll = () => {
    const allStudentIds = students.map((s: any) => s.id);
    const current = form.getValues("studentIds");
    if (current.length === students.length) {
      form.setValue("studentIds", []);
    } else {
      form.setValue("studentIds", allStudentIds);
    }
  };

  const getStudentFullName = (student: any) => {
    const parts = [student.firstName, student.middleName, student.lastName].filter(Boolean);
    return parts.join(" ");
  };

  const getGuardianFullName = (guardian: any) => {
    return `${guardian.firstName} ${guardian.lastName}`;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/parents">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Parents
            </Link>
          </Button>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold">Link Students & Guardian</h1>
          <p className="text-sm text-muted-foreground">
            Select students and assign them to a guardian
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Guardian Selection Card */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Guardian Information</CardTitle>
                <CardDescription>Select the guardian for the students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="guardianId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Guardian <span className="text-destructive">*</span>
                      </FormLabel>
                      {preSelectedGuardianId ? (
                        <div className="p-3 border rounded-md bg-muted">
                          <p className="text-sm font-medium">
                            {parents.find((p: any) => p.id === preSelectedGuardianId)
                              ? getGuardianFullName(
                                  parents.find((p: any) => p.id === preSelectedGuardianId)
                                )
                              : "Loading..."}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Pre-selected</p>
                        </div>
                      ) : (
                        <>
                          <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              placeholder="Search guardians..."
                              value={guardianSearch}
                              onChange={(e) => setGuardianSearch(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a guardian" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {parents.map((guardian: any) => (
                                <SelectItem key={guardian.id} value={guardian.id}>
                                  {getGuardianFullName(guardian)} ({guardian.phone})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Relationship Type <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ParentRelationship.MOTHER}>Mother</SelectItem>
                          <SelectItem value={ParentRelationship.FATHER}>Father</SelectItem>
                          <SelectItem value={ParentRelationship.GUARDIAN}>Guardian</SelectItem>
                          <SelectItem value={ParentRelationship.GRANDPARENT}>Grandparent</SelectItem>
                          <SelectItem value={ParentRelationship.SIBLING}>Sibling</SelectItem>
                          <SelectItem value={ParentRelationship.OTHER}>Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Relationship to the selected student(s)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPrimary"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Primary Contact</FormLabel>
                        <FormDescription>
                          Mark as primary contact for selected students
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {selectedStudentIds.length > 0 && (
                  <div className="p-4 bg-primary/10 rounded-md">
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <UserCheck className="h-5 w-5" />
                      <span>{selectedStudentIds.length} student(s) selected</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Students Selection Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Select Students</CardTitle>
                <CardDescription>
                  Choose which students to link to this guardian
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search students by name or student number..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select
                    value={genderFilter}
                    onValueChange={(value) => setGenderFilter(value as Gender | "all")}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value={Gender.MALE}>Male</SelectItem>
                      <SelectItem value={Gender.FEMALE}>Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Students Table */}
                <div className="border rounded-md max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              students.length > 0 &&
                              selectedStudentIds.length === students.length
                            }
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Student Number</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Guardians</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Loading students...
                          </TableCell>
                        </TableRow>
                      ) : students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <Users className="h-12 w-12" />
                              <p>No students found</p>
                              {studentSearch && (
                                <p className="text-sm">Try adjusting your search</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        students.map((student: any) => {
                          const isSelected = selectedStudentIds.includes(student.id);
                          const hasGuardians =
                            student.studentGuardians && student.studentGuardians.length > 0;

                          return (
                            <TableRow
                              key={student.id}
                              className={isSelected ? "bg-accent" : ""}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleStudent(student.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {getStudentFullName(student)}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {student.studentNumber}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {student.gender.toLowerCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {hasGuardians ? (
                                  <span className="text-sm text-muted-foreground">
                                    {student.studentGuardians.length} guardian(s)
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">None</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {!studentsLoading && students.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * pageSize + 1} to{" "}
                      {Math.min(page * pageSize, meta.total)} of {meta.total} students
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className={
                              page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                        {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                          .filter(
                            (p) =>
                              p === 1 ||
                              p === meta.totalPages ||
                              (p >= page - 1 && p <= page + 1)
                          )
                          .map((p) => (
                            <PaginationItem key={p}>
                              <PaginationLink
                                onClick={() => setPage(p)}
                                isActive={p === page}
                                className="cursor-pointer"
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                            className={
                              page === meta.totalPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || selectedStudentIds.length === 0}>
              {isSubmitting ? "Linking..." : `Link ${selectedStudentIds.length} Student(s)`}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
