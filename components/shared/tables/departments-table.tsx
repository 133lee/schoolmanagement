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

export function DepartmentsTable({
  departments,
  onRowClick,
  onEdit,
  onDelete,
  onViewDetails,
  showActions = true,
}: DepartmentsTableProps) {
  console.log("[TABLE] DepartmentsTable rendering with departments - HOD data:", departments.map(d => ({
    departmentId: d.id,
    departmentName: d.name,
    hodTeacherId: d.hod?.id,
    hod: d.hod,
  })));

  return (
    <div className="rounded-md border">
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
          {departments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="text-center text-muted-foreground">
                No departments found
              </TableCell>
            </TableRow>
          ) : (
            departments.map((department) => (
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
                  <Badge variant={
                    department.status === "Active" || department.status === "ACTIVE"
                      ? "default"
                      : "secondary"
                  }>
                    {department.status === "ACTIVE" ? "Active" :
                     department.status === "INACTIVE" ? "Inactive" :
                     department.status === "ARCHIVED" ? "Archived" :
                     department.status}
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
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
