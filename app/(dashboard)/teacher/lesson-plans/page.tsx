"use client";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Clock } from "lucide-react";

export default function LessonPlansPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Lesson Plans</h1>
          <p className="text-muted-foreground text-sm">
            Create and manage your lesson plans
          </p>
        </div>
      </div>

      {/* Coming Soon Empty State */}
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <Empty>
          <EmptyContent>
            <EmptyMedia variant="icon">
              <Clock className="h-12 w-12" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>Coming Soon</EmptyTitle>
              <EmptyDescription>
                Lesson planning features are currently under development and
                will be available soon.
              </EmptyDescription>
            </EmptyHeader>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  );
}
