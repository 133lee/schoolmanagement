"use client";

import React from "react";
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
  Phone,
  Mail,
  BookOpen,
  KeyRound,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TeacherProfile, StaffStatus } from "@/types/prisma-enums";

type TeacherWithRelations = TeacherProfile & {
  departments?: Array<{ department: { name: string; code: string } }>;
  subjects?: Array<{ subject: { id: string; name: string; code: string } }>;
  user?: { email: string } | null;
};

interface TeachersTableProps {
  teachers: TeacherWithRelations[];
  onRowClick: (teacher: TeacherWithRelations) => void;
  onEdit: (teacher: TeacherWithRelations) => void;
  onDelete: (teacher: TeacherWithRelations) => void;
  onContact?: (teacher: TeacherWithRelations) => void;
  onResetPassword?: (teacher: TeacherWithRelations) => void;
  showActions?: boolean;
  /** Hide the staff-number badge on the mobile card row (desktop table is unaffected). */
  hideStaffNumberOnMobile?: boolean;
}

const getStatusVariant = (status: StaffStatus) => {
  switch (status) {
    case StaffStatus.ACTIVE:
      return "default";
    case StaffStatus.ON_LEAVE:
      return "outline";
    case StaffStatus.SUSPENDED:
      return "secondary";
    case StaffStatus.TERMINATED:
    case StaffStatus.RETIRED:
      return "destructive";
    default:
      return "outline";
  }
};

export function TeachersTable({
  teachers,
  onRowClick,
  onEdit,
  onDelete,
  onContact,
  onResetPassword,
  showActions = true,
  hideStaffNumberOnMobile = false,
}: TeachersTableProps) {
  const renderActions = (teacher: TeacherWithRelations) => (
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
            onEdit(teacher);
          }}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        {onContact && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onContact(teacher);
            }}>
            <Phone className="h-4 w-4 mr-2" />
            Contact
          </DropdownMenuItem>
        )}
        {onResetPassword && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onResetPassword(teacher);
            }}>
            <KeyRound className="h-4 w-4 mr-2" />
            Reset Password
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDelete(teacher);
          }}
          className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (teachers.length === 0) {
    return (
      <div className="rounded-md border py-10 text-center text-sm text-muted-foreground">
        No teachers found
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: tappable card rows — phone and subjects dropped from the
          card front (still one tap away via the detail sheet) to keep this
          compact and single-row. ────────────────────────────────────────── */}
      <div className="lg:hidden rounded-md border divide-y overflow-hidden">
        {teachers.map((teacher) => {
          const fullName = `${teacher.firstName} ${teacher.lastName}`;
          const initials = `${teacher.firstName[0]}${teacher.lastName[0]}`;

          return (
            <div
              key={teacher.id}
              onClick={() => onRowClick(teacher)}
              className="flex items-center gap-3 p-3 active:bg-muted/70 transition-colors cursor-pointer"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                <p className="font-semibold text-sm truncate flex-1 min-w-0">{fullName}</p>
                {!hideStaffNumberOnMobile && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono shrink-0">
                    {teacher.staffNumber}
                  </Badge>
                )}
                <Badge variant={getStatusVariant(teacher.status)} className="text-[10px] px-1.5 py-0 shrink-0">
                  {teacher.status}
                </Badge>
              </div>
              {showActions && renderActions(teacher)}
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
              <TableHead>Teacher</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Subjects</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => {
              const fullName = `${teacher.firstName} ${teacher.lastName}`;
              const initials = `${teacher.firstName[0]}${teacher.lastName[0]}`;
              const subjectsList = teacher.subjects?.map(ts => ts.subject.name) || [];

              return (
                <TableRow
                  key={teacher.id}
                  onClick={() => onRowClick(teacher)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {teacher.staffNumber}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{teacher.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {subjectsList.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">
                            {subjectsList[0]}
                            {subjectsList.length > 1 && (
                              <Badge variant="secondary" className="ml-2">
                                +{subjectsList.length - 1}
                              </Badge>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No subjects assigned
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(teacher.status)}>
                      {teacher.status}
                    </Badge>
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      {renderActions(teacher)}
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
