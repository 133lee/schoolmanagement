"use client";

import React from "react";
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
  BookOpen,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Subject } from "@/types/prisma-enums";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

type ExtendedSubject = Subject & {
  department?: {
    id: string;
    name: string;
  } | null;
  teacherSubjects?: Array<{
    teacher: Teacher;
  }>;
};

interface SubjectsTableProps {
  subjects: ExtendedSubject[];
  onRowClick: (subject: ExtendedSubject) => void;
  onEdit: (subject: ExtendedSubject) => void;
  onDelete: (subject: ExtendedSubject) => void;
  showActions?: boolean;
}

export function SubjectsTable({
  subjects,
  onRowClick,
  onEdit,
  onDelete,
  showActions = true,
}: SubjectsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Teachers</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 4 : 3} className="text-center text-muted-foreground">
                No subjects found
              </TableCell>
            </TableRow>
          ) : (
            subjects.map((subject) => {
              const teachers = subject.teacherSubjects?.map(ts => ts.teacher) || [];
              const primaryTeacher = teachers[0];

              return (
                <TableRow
                  key={subject.id}
                  onClick={() => onRowClick(subject)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-semibold text-sm">
                          {subject.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {subject.code}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {subject.department ? (
                      <Badge variant="outline">
                        {subject.department.name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No department
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {primaryTeacher ? (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {primaryTeacher.firstName} {primaryTeacher.lastName}
                          {teachers.length > 1 && (
                            <Badge variant="secondary" className="ml-2">
                              +{teachers.length - 1}
                            </Badge>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No teachers assigned
                      </span>
                    )}
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
                              onEdit(subject);
                            }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(subject);
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
