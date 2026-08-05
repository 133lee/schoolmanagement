"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Shield, UserCog, Clock } from "lucide-react";

// Placeholder component - will be fully implemented once API is ready
export function AuditLog() {
  // Mock data for demonstration
  // NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
  // Role changes only involve: ADMIN, HEAD_TEACHER, DEPUTY_HEAD, TEACHER, CLERK
  const auditLogs = [
    {
      id: "1",
      action: "ROLE_CHANGED",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      user: { firstName: "John", lastName: "Admin" },
      target: { firstName: "Mary", lastName: "Teacher" },
      details: "Role changed from TEACHER to DEPUTY_HEAD",
    },
    {
      id: "2",
      action: "PERMISSION_ADDED",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      user: { firstName: "John", lastName: "Admin" },
      target: { firstName: "Sarah", lastName: "Deputy" },
      details: "Permission override: MANAGE_TIMETABLE (Expires: 2025-12-31)",
    },
    {
      id: "3",
      action: "PERMISSION_REMOVED",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      user: { firstName: "John", lastName: "Admin" },
      target: { firstName: "Peter", lastName: "Clerk" },
      details: "Permission override removed: CREATE_TEACHER",
    },
  ];

  const getActionIcon = (action: string) => {
    switch (action) {
      case "ROLE_CHANGED":
        return <UserCog className="h-4 w-4 text-blue-600" />;
      case "PERMISSION_ADDED":
        return <Shield className="h-4 w-4 text-green-600" />;
      case "PERMISSION_REMOVED":
        return <Shield className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "ROLE_CHANGED":
        return <Badge variant="default">Role Changed</Badge>;
      case "PERMISSION_ADDED":
        return <Badge className="bg-green-600">Permission Added</Badge>;
      case "PERMISSION_REMOVED":
        return <Badge variant="destructive">Permission Removed</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInDays === 1) return "Yesterday";
    return `${diffInDays} days ago`;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
        <CardDescription>
          History of all permission and role changes in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">{getActionIcon(log.action)}</div>

              {/* Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    {getActionBadge(log.action)}
                    <p className="text-sm font-medium mt-1">{log.details}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(log.timestamp)}
                  </span>
                </div>

                {/* User info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {getInitials(log.user.firstName, log.user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      By {log.user.firstName} {log.user.lastName}
                    </span>
                  </div>
                  <span>→</span>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                        {getInitials(log.target.firstName, log.target.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      For {log.target.firstName} {log.target.lastName}
                    </span>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {log.timestamp.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {auditLogs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No audit logs available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
