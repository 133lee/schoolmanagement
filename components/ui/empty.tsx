import * as React from "react";
import { cn } from "@/lib/utils";

const Empty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-center", className)}
    {...props}
  />
));
Empty.displayName = "Empty";

const EmptyContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col items-center text-center", className)}
    {...props}
  />
));
EmptyContent.displayName = "EmptyContent";

const EmptyMedia = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "icon" | "image";
  }
>(({ className, variant = "icon", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "mb-4 flex items-center justify-center",
      variant === "icon" && "h-12 w-12 rounded-full bg-muted text-muted-foreground",
      className
    )}
    {...props}
  />
));
EmptyMedia.displayName = "EmptyMedia";

const EmptyHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-2", className)}
    {...props}
  />
));
EmptyHeader.displayName = "EmptyHeader";

const EmptyTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
));
EmptyTitle.displayName = "EmptyTitle";

const EmptyDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
EmptyDescription.displayName = "EmptyDescription";

export { Empty, EmptyContent, EmptyMedia, EmptyHeader, EmptyTitle, EmptyDescription };
