"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Filter, X } from "lucide-react";

// Generic status type
export type AccessRequestStatus = "pending" | "approved" | "rejected" | "success";

interface StatusOption {
  value: AccessRequestStatus | "all";
  label: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "success", label: "Success" },
];

export interface AccessRequestFilterState {
  search: string;
  status: AccessRequestStatus | "all";
}

export interface PaginationInfo {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface AccessRequestFilterProps {
  filters: AccessRequestFilterState;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AccessRequestStatus | "all") => void;
  onClearFilters: () => void;
  pagination: PaginationInfo | null;
  searchPlaceholder?: string;
  resultLabel?: string;
}

export function AccessRequestFilter({
  filters,
  onSearchChange,
  onStatusChange,
  onClearFilters,
  pagination,
  searchPlaceholder = "Search by name, mobile, investigator...",
  resultLabel = "access requests",
}: AccessRequestFilterProps) {
  const hasActiveFilters = filters.search || filters.status !== "all";

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={filters.status}
            onValueChange={(value) => onStatusChange(value as AccessRequestStatus | "all")}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Results Summary */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {pagination?.total_count || 0}
            </span>{" "}
            {resultLabel} found
          </span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              Filters active
            </Badge>
          )}
        </div>
        {pagination && pagination.total_pages > 0 && (
          <span className="text-muted-foreground">
            Page {pagination.page} of {pagination.total_pages}
          </span>
        )}
      </div>
    </Card>
  );
}
