"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssessmentFilterOptions } from "@/types/hod-assessment";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  filters: AssessmentFilterOptions;
  searchQuery: string;
  onFilterChange: (key: keyof AssessmentFilterOptions, value: string) => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
  filterOptions: {
    terms: { id: string; name: string }[];
    assessmentTypes: string[];
    classes: { id: string; name: string }[];
    teachers: { id: string; name: string }[];
  };
}

const statuses = ["All", "Completed", "In Progress", "Not Started", "Overdue"];

export function FilterBar({
  filters,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onClearFilters,
  filterOptions,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.term ||
    filters.assessmentType ||
    filters.class ||
    filters.teacher ||
    filters.status !== "All";

  // Mobile-only: which field in each row is currently open, so it can grow
  // while the other(s) in that same row shrink out of its way.
  const [activeRow1, setActiveRow1] = useState<"term" | "assessmentType" | null>(null);
  const [activeRow2, setActiveRow2] = useState<"class" | "teacher" | "status" | null>(null);
  const flexRow1 = (key: "term" | "assessmentType") =>
    activeRow1 === key ? "flex-none max-w-[70%]" : "flex-1";
  const triggerRow1 = (key: "term" | "assessmentType") =>
    activeRow1 === key ? "w-fit" : "w-full";
  const flexRow2 = (key: "class" | "teacher" | "status") =>
    activeRow2 === key ? "flex-none max-w-[70%]" : "flex-1";
  const triggerRow2 = (key: "class" | "teacher" | "status") =>
    activeRow2 === key ? "w-fit" : "w-full";

  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border">
      <div className="flex flex-col gap-4">
        {/* Search and Clear */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by teacher, subject, or class..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* ── Mobile filters: row one is Term/Type (the open one grows, the
            other shrinks); row two is Class/Teacher/Status, same logic
            among themselves. ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 md:hidden">
          <div className="flex gap-2">
            <div className={cn("min-w-0 transition-all duration-200", flexRow1("term"))}>
              <Select
                value={filters.term}
                onValueChange={(value) => onFilterChange("term", value)}
                onOpenChange={(open) => setActiveRow1(open ? "term" : null)}
              >
                <SelectTrigger className={triggerRow1("term")}>
                  <SelectValue placeholder="Term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  {filterOptions.terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={cn("min-w-0 transition-all duration-200", flexRow1("assessmentType"))}>
              <Select
                value={filters.assessmentType}
                onValueChange={(value) => onFilterChange("assessmentType", value)}
                onOpenChange={(open) => setActiveRow1(open ? "assessmentType" : null)}
              >
                <SelectTrigger className={triggerRow1("assessmentType")}>
                  <SelectValue placeholder="Assessment Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {filterOptions.assessmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <div className={cn("min-w-0 transition-all duration-200", flexRow2("class"))}>
              <Select
                value={filters.class}
                onValueChange={(value) => onFilterChange("class", value)}
                onOpenChange={(open) => setActiveRow2(open ? "class" : null)}
              >
                <SelectTrigger className={triggerRow2("class")}>
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {filterOptions.classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={cn("min-w-0 transition-all duration-200", flexRow2("teacher"))}>
              <Select
                value={filters.teacher}
                onValueChange={(value) => onFilterChange("teacher", value)}
                onOpenChange={(open) => setActiveRow2(open ? "teacher" : null)}
              >
                <SelectTrigger className={triggerRow2("teacher")}>
                  <SelectValue placeholder="Teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {filterOptions.teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={cn("min-w-0 transition-all duration-200", flexRow2("status"))}>
              <Select
                value={filters.status}
                onValueChange={(value) => onFilterChange("status", value)}
                onOpenChange={(open) => setActiveRow2(open ? "status" : null)}
              >
                <SelectTrigger className={triggerRow2("status")}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Tablet/desktop filters — unchanged ──────────────────────── */}
        <div className="hidden md:grid md:grid-cols-5 gap-3">
          <Select
            value={filters.term}
            onValueChange={(value) => onFilterChange("term", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              {filterOptions.terms.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.assessmentType}
            onValueChange={(value) => onFilterChange("assessmentType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Assessment Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {filterOptions.assessmentTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.class}
            onValueChange={(value) => onFilterChange("class", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {filterOptions.classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.teacher}
            onValueChange={(value) => onFilterChange("teacher", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {filterOptions.teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(value) => onFilterChange("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
