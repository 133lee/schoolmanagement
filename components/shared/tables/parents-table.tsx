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
  Link,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Guardian, ParentStatus } from "@/types/prisma-enums";

type ExtendedGuardian = Guardian & {
  _count?: {
    studentGuardians?: number;
  };
};

interface ParentsTableProps {
  parents: ExtendedGuardian[];
  onRowClick: (parent: ExtendedGuardian) => void;
  onEdit: (parent: ExtendedGuardian) => void;
  onDelete: (parent: ExtendedGuardian) => void;
  onContact?: (parent: ExtendedGuardian) => void;
  onLinkStudent?: (parent: ExtendedGuardian) => void;
  onSendSms?: (parent: ExtendedGuardian) => void;
  showActions?: boolean;
}

const getStatusVariant = (status: ParentStatus) => {
  switch (status) {
    case ParentStatus.ACTIVE:
      return "default";
    case ParentStatus.INACTIVE:
      return "secondary";
    case ParentStatus.DECEASED:
      return "destructive";
    default:
      return "outline";
  }
};

export function ParentsTable({
  parents,
  onRowClick,
  onEdit,
  onDelete,
  onContact,
  onLinkStudent,
  onSendSms,
  showActions = true,
}: ParentsTableProps) {
  const renderActions = (parent: ExtendedGuardian) => (
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
            onEdit(parent);
          }}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        {onLinkStudent && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onLinkStudent(parent);
            }}>
            <Link className="h-4 w-4 mr-2" />
            Link Student
          </DropdownMenuItem>
        )}
        {onSendSms && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onSendSms(parent);
            }}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Send SMS
          </DropdownMenuItem>
        )}
        {onContact && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onContact(parent);
            }}>
            <Phone className="h-4 w-4 mr-2" />
            Contact
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDelete(parent);
          }}
          className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (parents.length === 0) {
    return (
      <div className="rounded-md border py-10 text-center text-sm text-muted-foreground">
        No parents found
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: tappable card rows ─────────────────────────────────────── */}
      <div className="lg:hidden rounded-md border divide-y overflow-hidden">
        {parents.map((parent) => {
          const fullName = `${parent.firstName} ${parent.lastName}`;
          const initials = `${parent.firstName[0]}${parent.lastName[0]}`;
          const studentCount = parent._count?.studentGuardians || 0;

          return (
            <div
              key={parent.id}
              onClick={() => onRowClick(parent)}
              className="flex items-center gap-3 p-3 active:bg-muted/70 transition-colors cursor-pointer"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                <p className="font-semibold text-sm truncate flex-1 min-w-0">{fullName}</p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium shrink-0">
                  {studentCount} {studentCount === 1 ? "student" : "students"}
                </Badge>
                <Badge variant={getStatusVariant(parent.status)} className="text-[10px] px-1.5 py-0 shrink-0">
                  {parent.status}
                </Badge>
              </div>
              {showActions && renderActions(parent)}
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          );
        })}
      </div>

      {/* ── Desktop: table ──────────────────────────────────────────────────── */}
      <div className="hidden lg:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parent/Guardian</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {parents.map((parent) => {
              const fullName = `${parent.firstName} ${parent.lastName}`;
              const initials = `${parent.firstName[0]}${parent.lastName[0]}`;

              return (
                <TableRow
                  key={parent.id}
                  onClick={() => onRowClick(parent)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{fullName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{parent.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-medium">
                        {parent._count?.studentGuardians || 0}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {parent._count?.studentGuardians === 1 ? "student" : "students"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(parent.status)}>
                      {parent.status}
                    </Badge>
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      {renderActions(parent)}
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
