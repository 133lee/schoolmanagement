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
  Users,
  BookOpen,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DepartmentStatus } from "@/types/prisma-enums";

interface Department {
  id: string;
  name: string;
  code: string;
  teacherCount?: number;
  subjectCount?: number;
  status: DepartmentStatus | "Active" | "Inactive";
  hod?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface DepartmentsTableProps {
  departments: Department[];
  onRowClick: (department: Department) => void;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
  onViewDetails?: (department: Department) => void;
  showActions?: boolean;
}

const getStatusLabel = (status: Department["status"]) =>
  status === "ACTIVE" ? "Active" :
  status === "INACTIVE" ? "Inactive" :
  status === "ARCHIVED" ? "Archived" :
  status;

const getStatusVariant = (status: Department["status"]) =>
  status === "Active" || status === "ACTIVE" ? "default" : "secondary";

export function DepartmentsTable({
  departments,
  onRowClick,
  onEdit,
  onDelete,
  onViewDetails,
  showActions = true,
}: DepartmentsTableProps) {
  const renderActions = (department: Department) => (
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
            onEdit(department);
          }}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.(department);
          }}>
          <Building2 className="h-4 w-4 mr-2" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDelete(department);
          }}
          className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (departments.length === 0) {
    return (
      <div className="rounded-md border py-10 text-center text-sm text-muted-foreground">
        No departments found
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: tappable card rows — code instead of the full name,
          Code/HOD/Subjects columns dropped to keep this compact (still one
          tap away via the detail sheet). ────────────────────────────────── */}
      <div className="lg:hidden rounded-md border divide-y overflow-hidden">
        {departments.map((department) => (
          <div
            key={department.id}
            onClick={() => onRowClick(department)}
            className="flex items-center gap-3 p-3 active:bg-muted/70 transition-colors cursor-pointer"
          >
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{department.code}</p>
              <p className="text-xs text-muted-foreground">
                {department.teacherCount ?? 0} {(department.teacherCount ?? 0) === 1 ? "teacher" : "teachers"}
              </p>
            </div>
            <Badge variant={getStatusVariant(department.status)} className="text-[10px] px-1.5 py-0 shrink-0">
              {getStatusLabel(department.status)}
            </Badge>
            {showActions && renderActions(department)}
          </div>
        ))}
      </div>

      {/* ── Desktop: full table — unchanged ─────────────────────────────── */}
      <div className="hidden lg:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Head of Department</TableHead>
              <TableHead>Teachers</TableHead>
              <TableHead>Subjects</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((department) => (
              <TableRow
                key={department.id}
                onClick={() => onRowClick(department)}
                className="cursor-pointer"
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-sm">
                        {department.name || "Unknown"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {department.code}
                  </Badge>
                </TableCell>
                <TableCell>
                  {department.hod ? (
                    <div className="text-sm">
                      {`${department.hod.firstName} ${department.hod.lastName}`}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not assigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {department.teacherCount ?? 0}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {department.subjectCount ?? 0}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(department.status)}>
                    {getStatusLabel(department.status)}
                  </Badge>
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    {renderActions(department)}
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
