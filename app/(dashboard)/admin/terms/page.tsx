"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Terms Management Page
 *
 * TODO: Enhance with:
 * - Custom hook (useTerms)
 * - Table component (TermsTable)
 * - Create/Edit dialog components
 * - Pagination
 * - Better error handling
 */

interface AcademicYear {
  id: string;
  year: number;
  isActive: boolean;
}

interface Term {
  id: string;
  termType: "TERM_1" | "TERM_2" | "TERM_3";
  startDate: string;
  endDate: string;
  isActive: boolean;
  academicYear: AcademicYear;
}

export default function TermsManagement() {
  const { toast } = useToast();
  const [terms, setTerms] = useState<Term[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Fetch academic years
  const fetchAcademicYears = async () => {
    try {
      const response = await fetch("/api/academic-years");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setAcademicYears(data.data || []);

      // Auto-select active year
      const activeYear = data.data?.find((y: AcademicYear) => y.isActive);
      if (activeYear) {
        setSelectedYearId(activeYear.id);
      }
    } catch (error) {
      console.error("Error fetching academic years:", error);
    }
  };

  // Fetch terms
  const fetchTerms = async (academicYearId?: string) => {
    try {
      setLoading(true);
      const url = academicYearId
        ? `/api/terms?academicYearId=${academicYearId}`
        : "/api/terms";

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch terms");

      const data = await response.json();
      setTerms(data.data || []);
    } catch (error) {
      console.error("Error fetching terms:", error);
      toast({
        title: "Error",
        description: "Failed to load terms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (selectedYearId) {
      fetchTerms(selectedYearId);
    }
  }, [selectedYearId]);

  // Activate term
  const handleActivate = async (id: string) => {
    try {
      const response = await fetch(`/api/terms/${id}/activate`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to activate");
      }

      toast({
        title: "Success",
        description: "Term activated",
      });

      fetchTerms(selectedYearId);
    } catch (error: any) {
      console.error("Error activating term:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Deactivate term
  const handleDeactivate = async (id: string) => {
    try {
      const response = await fetch(`/api/terms/${id}/deactivate`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to deactivate");
      }

      toast({
        title: "Success",
        description: "Term deactivated",
      });

      fetchTerms(selectedYearId);
    } catch (error: any) {
      console.error("Error deactivating term:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTermLabel = (termType: string) => {
    switch (termType) {
      case "TERM_1":
        return "Term 1";
      case "TERM_2":
        return "Term 2";
      case "TERM_3":
        return "Term 3";
      default:
        return termType;
    }
  };

  if (loading && terms.length === 0) {
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
          <h1 className="text-3xl font-bold">Terms</h1>
          <p className="text-muted-foreground">
            Manage academic terms for each school year
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Term
        </Button>
      </div>

      {/* Academic Year Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Academic Year</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedYearId} onValueChange={setSelectedYearId}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((year) => (
                <SelectItem key={year.id} value={year.id}>
                  {year.year} {year.isActive && "(Active)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Terms List */}
      <div className="grid gap-4">
        {terms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No terms found</p>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedYearId
                  ? "Create terms for this academic year"
                  : "Select an academic year to view terms"}
              </p>
              {selectedYearId && (
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Term
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          terms.map((term) => (
            <Card key={term.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {getTermLabel(term.termType)} - {term.academicYear.year}
                  </CardTitle>
                  <div className="flex gap-2">
                    {term.isActive && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <p>
                      {new Date(term.startDate).toLocaleDateString()} -{" "}
                      {new Date(term.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!term.isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivate(term.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Activate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeactivate(term.id)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Deactivate
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
            <li>Create/Edit Term dialog</li>
            <li>Delete confirmation</li>
            <li>Statistics view (assessments, attendance, etc.)</li>
            <li>Better error handling and loading states</li>
            <li>Validation (dates within academic year, no overlaps)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
