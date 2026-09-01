"use client";

import { Monitor } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface DesktopOnlyNoticeProps {
  title?: string;
  description?: string;
}

/** Shown in place of a page's content when useIsMobile() is true, for admin
 *  screens that are complex, low-frequency setup tools not worth building a
 *  mobile layout for (e.g. timetable configuration/generation, rooms). */
export function DesktopOnlyNotice({
  title = "Desktop only",
  description = "This page needs a larger screen — please switch to a tablet or computer to continue.",
}: DesktopOnlyNoticeProps) {
  return (
    <Empty className="h-[60vh]">
      <EmptyContent>
        <EmptyMedia variant="icon">
          <Monitor className="h-6 w-6" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </EmptyContent>
    </Empty>
  );
}
