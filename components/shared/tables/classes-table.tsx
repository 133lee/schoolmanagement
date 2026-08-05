"use client";

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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Class, ClassStatus } from "@/types/prisma-enums";

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
}: ClassesTableProps) {
  return (
    <div className="rounded-md border">
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
          {classes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 5 : 4} className="text-center text-muted-foreground">
                No classes found
              </TableCell>
            </TableRow>
          ) : (
            classes.map((classItem) => {
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
                        {classItem.name}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
