"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, CheckCircle, XCircle, Lock, Unlock, AlertTriangle } from "lucide-react";
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

/**
 * Academic Years Management Page
 *
 * TODO: Enhance with:
 * - Custom hook (useAcademicYears)
 * - Table component (AcademicYearsTable)
 * - Create/Edit dialog components
 * - Pagination
 * - Better error handling
 */

interface AcademicYear {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
}

export default function AcademicYearsManagement() {
  const { toast } = useToast();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [yearToClose, setYearToClose] = useState<string | null>(null);

  // Fetch academic years
  const fetchAcademicYears = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/academic-years");

      if (!response.ok) {
        throw new Error("Failed to fetch academic years");
      }

      const data = await response.json();
      setAcademicYears(data.data || []);
    } catch (error) {
      console.error("Error fetching academic years:", error);
      toast({
        title: "Error",
        description: "Failed to load academic years",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  // Activate academic year
  const handleActivate = async (id: string) => {
    try {
      const response = await fetch(`/api/academic-years/${id}/activate`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to activate");
      }

      toast({
        title: "Success",
        description: "Academic year activated",
      });

      fetchAcademicYears();
    } catch (error: any) {
      console.error("Error activating academic year:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Close academic year
  const handleCloseClick = (id: string) => {
    setYearToClose(id);
    setCloseDialogOpen(true);
  };

  const handleCloseConfirm = async () => {
    if (!yearToClose) return;

    try {
      const response = await fetch(`/api/academic-years/${yearToClose}/close`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to close");
      }

      toast({
        title: "Success",
        description: "Academic year closed successfully",
      });

      fetchAcademicYears();
    } catch (error: any) {
      console.error("Error closing academic year:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCloseDialogOpen(false);
      setYearToClose(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academic Years</h1>
          <p className="text-muted-foreground">
            Manage school academic years and terms
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Academic Year
        </Button>
      </div>

      <div className="grid gap-4">
        {academicYears.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No academic years found</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first academic year to get started
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Academic Year
              </Button>
            </CardContent>
          </Card>
        ) : (
          academicYears.map((year) => (
            <Card key={year.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Academic Year {year.year}
                  </CardTitle>
                  <div className="flex gap-2">
                    {year.isActive && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                    )}
                    {year.isClosed && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        <Lock className="h-3 w-3" />
                        Closed
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <p>
                      {new Date(year.startDate).toLocaleDateString()} -{" "}
                      {new Date(year.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!year.isActive && !year.isClosed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivate(year.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Activate
                      </Button>
                    )}
                    {year.isActive && !year.isClosed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCloseClick(year.id)}
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        Close Year
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>TODO:</strong> This page needs enhancement with:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Create/Edit Academic Year dialog</li>
            <li>Delete confirmation</li>
            <li>Statistics view (enrollments, terms, etc.)</li>
            <li>Terms management (sub-page)</li>
            <li>Search and filtering</li>
            <li>Pagination</li>
            <li>Better error handling and loading states</li>
          </ul>
        </CardContent>
      </Card>

      {/* Close Academic Year Confirmation Dialog */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Close Academic Year</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-3">
              Are you sure you want to close this academic year? This action will prevent further modifications to this year's data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Close Year
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
