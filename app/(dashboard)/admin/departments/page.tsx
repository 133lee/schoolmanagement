"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  RefreshCw,
  Plus,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DepartmentsTable } from "@/components/shared/tables/departments-table";
import { EditDepartmentDialog } from "@/components/departments/edit-department-dialog";
import { DepartmentSheet } from "@/components/departments/department-sheet";
import { useDepartments } from "@/hooks/useDepartments";
import { DepartmentStatus } from "@/types/prisma-enums";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DepartmentsManagement() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DepartmentStatus | "all">(
    "all"
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    string | null
  >(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDepartmentId, setSheetDepartmentId] = useState<string | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<any>(null);

  // Use the departments hook with filters and pagination
  const { departments, meta, isLoading, error, refetch, deleteDepartment } =
    useDepartments(
      {
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search || undefined,
      },
      { page, pageSize }
    );

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Department list has been refreshed",
    });
  };

  const handleRowClick = (department: any) => {
    setSheetDepartmentId(department.id);
    setSheetOpen(true);
  };

  const handleEdit = (department: any) => {
    setSelectedDepartmentId(department.id);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (department: any) => {
    setDepartmentToDelete(department);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!departmentToDelete) return;

    try {
      await deleteDepartment(departmentToDelete.id);
      toast({
        title: "Success",
        description: "Department deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete department",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
    }
  };

  const handleViewDetails = (department: any) => {
    setSheetDepartmentId(department.id);
    setSheetOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      setPage(newPage);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const totalPages = meta.totalPages;
    const currentPage = meta.page;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "ellipsis", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(
          1,
          "ellipsis",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(
          1,
          "ellipsis",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "ellipsis",
          totalPages
        );
      }
    }

    return pages;
  };
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Departments Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage departments, assign teachers, and track statistics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button className="flex-1 sm:flex-none" asChild>
            <Link href="/admin/departments/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="flex flex-col h-[calc(100vh-12rem)]">
        <CardHeader>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search departments..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as DepartmentStatus | "all")
              }>
              <SelectTrigger className="w-35">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={DepartmentStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={DepartmentStatus.INACTIVE}>
                  Inactive
                </SelectItem>
                <SelectItem value={DepartmentStatus.ARCHIVED}>
                  Archived
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          {error && (
            <div className="p-4 mb-4 bg-destructive/10 text-destructive rounded-md">
              <p className="font-medium">Error loading departments</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3 pt-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          ) : departments.length === 0 ? (
            <Empty className="h-96">
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <Building2 className="h-6 w-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No departments found</EmptyTitle>
                  <EmptyDescription>
                    {search || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Start by adding new departments to the system"}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <DepartmentsTable
              departments={departments}
              onRowClick={handleRowClick}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onViewDetails={handleViewDetails}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && departments.length > 0 && (
        <div className="flex items-center justify-between">
          <Pagination className="flex items-center justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(page - 1)}
                  className={
                    page === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {getPageNumbers().map((pageNum, index) =>
                pageNum === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => handlePageChange(pageNum as number)}
                      isActive={pageNum === page}
                      className="cursor-pointer">
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(page + 1)}
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

      {/* Edit Department Dialog */}
      {/* No onSuccess->refetch() here: useDepartments().updateDepartment already
          refetches the list internally on success — wiring it up again here
          fired two identical, near-simultaneous GET requests on every save. */}
      <EditDepartmentDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedDepartmentId(null);
          }
        }}
        departmentId={selectedDepartmentId || undefined}
      />

      {/* Department Details Sheet */}
      <DepartmentSheet
        departmentId={sheetDepartmentId}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setSheetDepartmentId(null);
          }
        }}
      />

      {/* Delete Department Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Delete Department</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-3">
              Are you sure you want to delete department{" "}
              <span className="font-semibold">{departmentToDelete?.name}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
