"use client";

import { Plus, RefreshCw, FileDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FloatingActionsProps {
  onAssignClick: () => void;
  onBulkReassignClick?: () => void;
  onExportClick?: () => void;
  onStatsClick?: () => void;
}

export function FloatingActions({
  onAssignClick,
  onBulkReassignClick,
  onExportClick,
  onStatsClick,
}: FloatingActionsProps) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      {onStatsClick && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-12 w-12 rounded-full shadow-lg"
              onClick={onStatsClick}
            >
              <BarChart3 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">View Statistics</TooltipContent>
        </Tooltip>
      )}

      {onExportClick && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-12 w-12 rounded-full shadow-lg"
              onClick={onExportClick}
            >
              <FileDown className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Export Report</TooltipContent>
        </Tooltip>
      )}

      {onBulkReassignClick && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-12 w-12 rounded-full shadow-lg"
              onClick={onBulkReassignClick}
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Bulk Reassign</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={onAssignClick}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Assign Teacher</TooltipContent>
      </Tooltip>
    </div>
  );
}
