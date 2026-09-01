"use client";

import { formatCompactClassLabel } from "@/lib/utils";
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
  Users,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Class, ClassStatus } from "@/types/prisma-enums";
import { cn } from "@/lib/utils";

type ClassWithRelations = Class & {
  grade?: { name: string; level: string | number } | null;
  classTeacherAssignments?: Array<{
    teacher: {
      firstName: string;
      lastName: string;
    };
  }>;
  subjectTeacherAssignments?: Array<{
    subject: {
      name: string;
      code: string;
    };
  }>;
};

interface ClassesTableProps {
  classes: ClassWithRelations[];
  onRowClick: (classItem: ClassWithRelations) => void;
  onEdit: (classItem: ClassWithRelations) => void;
  onDelete: (classItem: ClassWithRelations) => void;
  onEnrollStudents?: (classItem: ClassWithRelations) => void;
  onManageAssignments?: (classItem: ClassWithRelations) => void;
  showActions?: boolean;
  /** Opt in to a separate tappable card layout on mobile (grade column
   *  dropped, class name prefixed with its grade number instead). When
   *  false (default), the desktop table renders unchanged at every size. */
  mobileCardView?: boolean;
}

const getStatusVariant = (status: ClassStatus) => {
  switch (status) {
    case ClassStatus.ACTIVE:
      return "default";
    case ClassStatus.INACTIVE:
      return "secondary";
    case ClassStatus.ARCHIVED:
      return "outline";
    default:
      return "outline";
  }
};

export function ClassesTable({
  classes,
  onRowClick,
  onEdit,
  onDelete,
  onEnrollStudents,
  onManageAssignments,
  showActions = true,
  mobileCardView = false,
}: ClassesTableProps) {
  const renderActions = (classItem: ClassWithRelations) => (
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
            onEdit(classItem);
          }}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        {onEnrollStudents && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEnrollStudents(classItem);
            }}>
            <Users className="h-4 w-4 mr-2" />
            Enroll Students
          </DropdownMenuItem>
        )}
        {onManageAssignments && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onManageAssignments(classItem);
            }}>
            <BookOpen className="h-4 w-4 mr-2" />
            Manage Assignments
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDelete(classItem);
          }}
          className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (classes.length === 0) {
    return (
      <div className="rounded-md border py-10 text-center text-sm text-muted-foreground">
        No classes found
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: tappable card rows — grade dropped from the card front
          (the class name is prefixed with its grade number instead when it
          doesn't already read as "Form 1"–"Form 5") ────────────────────── */}
      {mobileCardView && (
      <div className="lg:hidden rounded-md border divide-y overflow-hidden">
        {classes.map((classItem) => {
          const classTeacher = classItem.classTeacherAssignments?.[0]?.teacher;
          const teacherName = classTeacher
            ? `${classTeacher.firstName} ${classTeacher.lastName}`
            : "Not assigned";

          return (
            <div
              key={classItem.id}
              onClick={() => onRowClick(classItem)}
              className="flex items-center gap-3 p-3 active:bg-muted/70 transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {formatCompactClassLabel(classItem.grade?.name, classItem.name)}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {teacherName} · {classItem.currentEnrolled}/{classItem.capacity}
                </p>
              </div>
              <Badge variant={getStatusVariant(classItem.status)} className="text-[10px] px-1.5 py-0 shrink-0">
                {classItem.status}
              </Badge>
              {showActions && renderActions(classItem)}
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          );
        })}
      </div>
      )}

      {/* ── Desktop table — unchanged; only restricted to lg+ when the
          mobile card view above is active for this consumer ───────────── */}
      <div className={cn("rounded-md border", mobileCardView && "hidden lg:block")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Grade Level</TableHead>
              <TableHead>Class Teacher</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((classItem) => {
              const classTeacher = classItem.classTeacherAssignments?.[0]?.teacher;
              const teacherName = classTeacher
                ? `${classTeacher.firstName} ${classTeacher.lastName}`
                : "Not assigned";

              return (
                <TableRow
                  key={classItem.id}
                  onClick={() => onRowClick(classItem)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div>
                      <p className="font-semibold text-sm">
                        {formatCompactClassLabel(classItem.grade?.name, classItem.name)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Capacity: {classItem.currentEnrolled}/{classItem.capacity}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {classItem.grade?.name || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {teacherName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(classItem.status)}>
                      {classItem.status}
                    </Badge>
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      {renderActions(classItem)}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
