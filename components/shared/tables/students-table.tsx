"use client";

import React from "react";
import { Student, StudentStatus, Gender } from "@/types/prisma-enums";
import { formatCompactClassLabel } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MoreVertical,
  Edit,
  Trash2,
  Check,
  X,
  Heart,
  Link,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Extended type for additional optional fields that might come from relations
type ExtendedStudent = Student & {
  photoUrl?: string;
  className?: string;
  grade?: string;
  vulnerabilityStatus?: string;
  vulnerabilityNotes?: string;
  hasGuardian?: boolean;
};

interface Parent {
  id: string;
  name: string;
  children: string[];
  status: "Active" | "Inactive";
}

interface StudentsTableProps {
  students: ExtendedStudent[];
  parents?: Parent[];
  onRowClick: (student: ExtendedStudent) => void;
  onEdit: (student: ExtendedStudent) => void;
  onDelete: (student: ExtendedStudent) => void;
  onEmergencyContact?: (student: ExtendedStudent) => void;
  onLinkGuardian?: (student: ExtendedStudent) => void;
  showActions?: boolean;
  /** Mobile card only: omit the avatar circle to keep the row tighter.
   *  Desktop table always keeps its avatar either way. */
  hideMobileAvatar?: boolean;
  /** Mobile card only: omit the class-label badge next to the name. On a
   *  crowded row (avatar + name + class badge + status badge + actions),
   *  the class badge was stealing enough width to truncate the name down
   *  to a couple of characters — dropping it gives the name its space
   *  back. Desktop table always keeps its class column either way. */
  hideMobileClassBadge?: boolean;
  /** Mobile card only: omit the status badge next to the name too (desktop
   *  table is unaffected) — for callers that want the row down to just
   *  name + actions. */
  hideMobileStatusBadge?: boolean;
}

const statusVariants: Record<StudentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  SUSPENDED: "destructive",
  GRADUATED: "outline",
  WITHDRAWN: "secondary",
  TRANSFERRED: "secondary",
  DECEASED: "destructive",
};

export function StudentsTable({
  students,
  parents = [],
  onRowClick,
  onEdit,
  onDelete,
  onEmergencyContact,
  onLinkGuardian,
  showActions = true,
  hideMobileAvatar = false,
  hideMobileClassBadge = false,
  hideMobileStatusBadge = false,
}: StudentsTableProps) {
  // Helper to get student full name
  const getFullName = (student: ExtendedStudent) => {
    const parts = [student.firstName, student.middleName, student.lastName].filter(Boolean);
    return parts.join(" ") || "Unknown";
  };

  // Helper to check if student has guardian
  const checkHasGuardian = (student: ExtendedStudent) => {
    // First check the hasGuardian property if provided
    if (student.hasGuardian !== undefined) {
      return student.hasGuardian;
    }

    // Otherwise check parents array if provided
    const fullName = getFullName(student);
    return parents.some((p) => p.children.includes(fullName));
  };

  const renderActions = (student: ExtendedStudent) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onEdit(student);
          }}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        {onLinkGuardian && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onLinkGuardian(student);
            }}>
            <Link className="h-4 w-4 mr-2" />
            Link Guardian
          </DropdownMenuItem>
        )}
        {onEmergencyContact && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEmergencyContact(student);
            }}>
            <Heart className="h-4 w-4 mr-2" />
            Emergency Contact
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDelete(student);
          }}
          className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (students.length === 0) {
    return (
      <div className="rounded-md border py-10 text-center text-sm text-muted-foreground">
        No students found
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: tappable card rows — gender/guardian columns dropped to
          keep the card compact; both stay visible in the desktop table and
          on the student's own detail sheet. ─────────────────────────────── */}
      <div className="lg:hidden rounded-md border divide-y overflow-hidden">
        {students.map((student) => {
          const classLabel =
            student.grade && student.className
              ? formatCompactClassLabel(student.grade, student.className)
              : student.className || student.grade || "No class assigned";

          return (
            <div
              key={student.id}
              onClick={() => onRowClick(student)}
              className="flex items-center gap-3 p-3 active:bg-muted/70 transition-colors cursor-pointer"
            >
              {!hideMobileAvatar && (
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={student.photoUrl} alt={getFullName(student)} />
                  <AvatarFallback>
                    {student.firstName?.[0]}{student.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                <p className="font-semibold text-sm truncate flex-1 min-w-0">{getFullName(student)}</p>
                {!hideMobileClassBadge && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium shrink-0 max-w-24 truncate">
                    {classLabel}
                  </Badge>
                )}
                {!hideMobileStatusBadge && (
                  <Badge variant={statusVariants[student.status]} className="text-[10px] px-1.5 py-0 shrink-0">
                    {student.status}
                  </Badge>
                )}
              </div>
              {showActions && renderActions(student)}
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          );
        })}
      </div>

      {/* ── Desktop: full table ─────────────────────────────────────────────── */}
      <div className="hidden lg:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Guardian</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow
                key={student.id}
                onClick={() => onRowClick(student)}
                className="cursor-pointer"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={student.photoUrl}
                        alt={getFullName(student)}
                      />
                      <AvatarFallback>
                        {student.firstName?.[0]}{student.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">
                        {getFullName(student)}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">
                    {student.gender === Gender.MALE ? "M" : student.gender === Gender.FEMALE ? "F" : "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">{student.grade || "—"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">
                    {student.grade && student.className
                      ? formatCompactClassLabel(student.grade, student.className)
                      : student.className || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  {checkHasGuardian(student) ? (
                    <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                      <Check className="h-3 w-3 mr-1" />
                      Linked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <X className="h-3 w-3 mr-1" />
                      Not Linked
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[student.status]}>
                    {student.status}
                  </Badge>
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    {renderActions(student)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
