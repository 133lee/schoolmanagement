"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Building, FileText, Users, Calendar, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ChangePasswordCard } from "@/components/profile/change-password-card";
import { PasswordChangePrompt } from "@/components/profile/password-change-prompt";

interface HODProfile {
  id: string;
  email: string;
  role: string;
  hasDefaultPassword: boolean;
  lastLogin: string | null;
  createdAt: string;
  department: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    status: string;
    createdAt: string;
    totalSubjects: number;
    totalTeachers: number;
    subjects: Array<{ id: string; name: string; code: string }>;
    teachers: Array<{ id: string; staffNumber: string; firstName: string; lastName: string; qualification: string }>;
  };
}

export default function HodProfilePage() {
  const [profile, setProfile] = useState<HODProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasDefaultPassword, setHasDefaultPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("auth_token");
      if (!token) { setError("Authentication token not found. Please login again."); return; }

      const response = await fetch("/api/hod/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch profile (${response.status})`);
      }
      const result = await response.json();
      if (!result?.data) throw new Error("Invalid response format from server");
      setProfile(result.data);
      setHasDefaultPassword(result.data.hasDefaultPassword || false);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load profile";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatStatus = (status: string) => (status === "ACTIVE" ? "Active" : "Inactive");

  if (loading) {
    return (
      <div className="space-y-4 px-4 lg:px-0 lg:space-y-6">
        <div className="hidden lg:flex items-start justify-between mt-2">
          <div className="flex flex-col space-y-1">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        {/* Mobile identity skeleton */}
        <div className="lg:hidden flex items-center gap-3 py-2">
          <Skeleton className="h-14 w-14 rounded-full shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {[0, 1].map((cardIdx) => (
              <div key={cardIdx} className="border rounded-lg p-6 space-y-4">
                <Skeleton className="h-5 w-48" />
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4"><Skeleton className="h-48 rounded-lg" /></div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Alert variant="destructive">
          <AlertDescription>{error || "Profile not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Derive initials from email (e.g. "jdoe@school.com" → "JD" or just "J")
  const emailInitial = profile.email[0]?.toUpperCase() ?? "H";

  return (
    <div className="space-y-4 px-4 lg:px-0 lg:space-y-6">
      <PasswordChangePrompt hasDefaultPassword={hasDefaultPassword} />

      {/* Desktop header — hidden on mobile (layout bar shows title) */}
      <div className="hidden lg:flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-1">
          <h1 className="text-xl font-bold">My Profile</h1>
          <p className="text-muted-foreground text-sm">
            View your profile and department information
          </p>
        </div>
      </div>

      {/* ── Mobile identity header ────────────────────────────────────────── */}
      <div className="lg:hidden flex items-center gap-3 py-2">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary select-none">{emailInitial}</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight truncate">{profile.email}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Head of Department</p>
          <p className="text-xs text-muted-foreground mt-0.5">{profile.department.name} ({profile.department.code})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* ── Left Column ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">

          {/* Account Information */}
          <Card>
            <CardHeader className="pb-2 lg:pb-4">
              <CardTitle className="text-sm lg:text-base">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Mobile compact rows */}
              <div className="lg:hidden divide-y">
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />Email
                  </span>
                  <span className="text-sm font-medium truncate ml-4 max-w-[55%]">{profile.email}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />Role
                  </span>
                  <span className="text-sm font-medium">Head of Department</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />Last Login
                  </span>
                  <span className="text-sm font-medium">
                    {profile.lastLogin ? format(new Date(profile.lastLogin), "MMM d, yyyy") : "Never"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />Joined
                  </span>
                  <span className="text-sm font-medium">
                    {format(new Date(profile.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
              {/* Desktop grid */}
              <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{profile.email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Role</label>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Head of Department</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Last Login</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {profile.lastLogin ? format(new Date(profile.lastLogin), "PPp") : "Never"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Account Created</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{format(new Date(profile.createdAt), "PPP")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Department Information */}
          <Card>
            <CardHeader className="pb-2 lg:pb-4">
              <CardTitle className="text-sm lg:text-base">Department Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Mobile compact rows */}
              <div className="lg:hidden divide-y">
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building className="h-3.5 w-3.5 shrink-0" />Name
                  </span>
                  <span className="text-sm font-medium">{profile.department.name}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 shrink-0" />Code
                  </span>
                  <span className="text-sm font-medium">{profile.department.code}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${profile.department.status === "ACTIVE" ? "bg-green-500" : "bg-red-500"}`} />
                    Status
                  </span>
                  <span className="text-sm font-medium">{formatStatus(profile.department.status)}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />Est.
                  </span>
                  <span className="text-sm font-medium">{format(new Date(profile.department.createdAt), "MMM d, yyyy")}</span>
                </div>
                {profile.department.description && (
                  <div className="py-2.5 space-y-1">
                    <span className="text-xs text-muted-foreground">Description</span>
                    <p className="text-sm font-medium">{profile.department.description}</p>
                  </div>
                )}
              </div>
              {/* Desktop grid */}
              <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Department Name</label>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{profile.department.name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Department Code</label>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{profile.department.code}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${profile.department.status === "ACTIVE" ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-sm font-medium">{formatStatus(profile.department.status)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Department Since</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{format(new Date(profile.department.createdAt), "PPP")}</span>
                  </div>
                </div>
                {profile.department.description && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs text-muted-foreground">Description</label>
                    <p className="text-sm">{profile.department.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Department Statistics — 2-col grid works fine on all sizes */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex flex-col items-center text-center">
                  <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">{profile.department.totalSubjects}</p>
                  <p className="text-xs text-muted-foreground">Subjects</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex flex-col items-center text-center">
                  <Users className="h-6 w-6 lg:h-8 lg:w-8 text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">{profile.department.totalTeachers}</p>
                  <p className="text-xs text-muted-foreground">Teachers</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Right Column ─────────────────────────────────────────────────── */}
        <div className="space-y-4 lg:space-y-6">
          <ChangePasswordCard />
        </div>
      </div>
    </div>
  );
}
