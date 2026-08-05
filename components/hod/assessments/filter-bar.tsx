"use client";

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

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
