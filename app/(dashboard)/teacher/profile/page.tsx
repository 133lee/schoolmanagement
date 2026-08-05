"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Mail, Phone, MapPin, Briefcase, Calendar, GraduationCap, Building } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ChangePasswordCard } from "@/components/profile/change-password-card";
import { PasswordChangePrompt } from "@/components/profile/password-change-prompt";

interface TeacherProfile {
  id: string;
  staffNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fullName: string;
  dateOfBirth: string | Date;
  gender: string;
  phoneNumber: string;
  nrcNumber?: string | null;
  address?: string;
  qualification: string | null;
  yearsExperience?: number;
  specialization?: string | null;
  status: string;
  dateOfHire: string | Date;
  email: string;
  department?: {
    name: string;
    code: string;
  } | null;
  subjects: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  classTeacherAssignment?: {
    className: string;
    gradeLevel: string;
  } | null;
}

export default function TeacherProfilePage() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasDefaultPassword, setHasDefaultPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
    // Check if user has default password from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setHasDefaultPassword(user.hasDefaultPassword || false);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        setError("Authentication token not found. Please login again.");
        return;
      }

      const response = await fetch("/api/teacher/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Failed to fetch profile (${response.status})`;
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Validate response structure
      if (!result || typeof result !== "object") {
        throw new Error("Invalid response format from server");
      }

      // Extract data from the API response wrapper
      const profileData = result.success ? result.data : result;

      if (!profileData) {
        throw new Error("No profile data returned from server");
      }

      setProfile(profileData);
      setError(null);
    } catch (err) {
      console.error("Error fetching profile:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load profile";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatQualification = (qual: string) => {
    const qualMap: Record<string, string> = {
      DIPLOMA: "Diploma",
      BACHELOR: "Bachelor's Degree",
      MASTER: "Master's Degree",
      DOCTORATE: "Doctorate",
      CERTIFICATE: "Certificate",
    };
    return qualMap[qual] || qual;
  };

  const formatGender = (gender: string) => {
    return gender === "MALE" ? "Male" : "Female";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between mt-2">
          <div className="flex flex-col space-y-1">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {Array.from({ length: 3 }).map((_, cardIdx) => (
              <div key={cardIdx} className="border rounded-lg p-6 space-y-4">
                <Skeleton className="h-5 w-48" />
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
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

  return (
    <div className="space-y-4 px-4 lg:px-0 lg:space-y-6">
      {/* Password Change Prompt Dialog */}
      <PasswordChangePrompt hasDefaultPassword={hasDefaultPassword} />

      {/* Header — desktop only */}
      <div className="hidden lg:flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-1">
          <h1 className="text-xl font-bold">My Profile</h1>
          <p className="text-muted-foreground text-sm">
            View and manage your profile information
          </p>
        </div>
      </div>

      {/* ── Mobile identity header ─────────────────────────────────────────── */}
      <div className="lg:hidden flex items-center gap-3 py-2">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary select-none">
            {profile.firstName[0]}{profile.lastName[0]}
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight truncate">{profile.fullName}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{profile.staffNumber}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${profile.status === "ACTIVE" ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-xs text-muted-foreground">{profile.status === "ACTIVE" ? "Active" : "Inactive"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* ── Left Column ────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">

          {/* Personal Information */}
          <Card>
            <CardHeader className="pb-2 lg:pb-4">
              <CardTitle className="text-sm lg:text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 lg:pt-0 lg:space-y-4">
              {/* Mobile compact rows */}
              <div className="lg:hidden divide-y">
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="h-3.5 w-3.5 shrink-0" />First Name</span>
                  <span className="text-sm font-medium">{profile.firstName}</span>
                </div>
                {profile.middleName && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="h-3.5 w-3.5 shrink-0" />Middle Name</span>
                    <span className="text-sm font-medium">{profile.middleName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="h-3.5 w-3.5 shrink-0" />Last Name</span>
                  <span className="text-sm font-medium">{profile.lastName}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="h-3.5 w-3.5 shrink-0" />Gender</span>
                  <span className="text-sm font-medium">{formatGender(profile.gender)}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5 shrink-0" />Date of Birth</span>
                  <span className="text-sm font-medium">
                    {profile.dateOfBirth ? format(new Date(profile.dateOfBirth), "MMM d, yyyy") : "—"}
                  </span>
                </div>
              </div>
              {/* Desktop grid */}
              <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Staff Number</Label>
                  <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{profile.staffNumber}</span></div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${profile.status === "ACTIVE" ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-sm font-medium">{profile.status === "ACTIVE" ? "Active" : "Inactive"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">First Name</Label>
                  <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{profile.firstName}</span></div>
                </div>
                {profile.middleName && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Middle Name</Label>
                    <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{profile.middleName}</span></div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Last Name</Label>
                  <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{profile.lastName}</span></div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Gender</Label>
                  <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{formatGender(profile.gender)}</span></div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{profile.dateOfBirth ? format(new Date(profile.dateOfBirth), "MMM dd, yyyy") : "Not specified"}</span></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-2 lg:pb-4">
              <CardTitle className="text-sm lg:text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 lg:pt-0 lg:space-y-4">
              {/* Mobile compact rows */}
              <div className="lg:hidden divide-y">
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5 shrink-0" />Email</span>
                  <span className="text-sm font-medium truncate ml-4 max-w-[55%]">{profile.email}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3.5 w-3.5 shrink-0" />Phone</span>
                  <span className="text-sm font-medium">{profile.phoneNumber}</span>
                </div>
                {profile.address && (
                  <div className="py-2.5 space-y-1">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />Address</span>
                    <span className="text-sm font-medium">{profile.address}</span>
                  </div>
                )}
              </div>
              {/* Desktop grid */}
              <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{profile.email}</span></div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{profile.phoneNumber}</span></div>
                </div>
                {profile.address && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{profile.address}</span></div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader className="pb-2 lg:pb-4">
              <CardTitle className="text-sm lg:text-base">Professional Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 lg:pt-0 lg:space-y-4">
              {/* Mobile compact rows */}
              <div className="lg:hidden divide-y">
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><GraduationCap className="h-3.5 w-3.5 shrink-0" />Qualification</span>
                  <span className="text-sm font-medium">{profile.qualification ? formatQualification(profile.qualification) : "—"}</span>
                </div>
                {profile.specialization && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><GraduationCap className="h-3.5 w-3.5 shrink-0" />Specialization</span>
                    <span className="text-sm font-medium">{profile.specialization}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5 shrink-0" />Hire Date</span>
                  <span className="text-sm font-medium">{profile.dateOfHire ? format(new Date(profile.dateOfHire), "MMM d, yyyy") : "—"}</span>
                </div>
                {profile.department && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Building className="h-3.5 w-3.5 shrink-0" />Department</span>
                    <span className="text-sm font-medium">{profile.department.name} ({profile.department.code})</span>
                  </div>
                )}
              </div>
              {/* Desktop grid */}
              <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Qualification</Label>
                  <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{profile.qualification ? formatQualification(profile.qualification) : "Not specified"}</span></div>
                </div>
                {profile.specialization && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Specialization</Label>
                    <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{profile.specialization}</span></div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Hire Date</Label>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{profile.dateOfHire ? format(new Date(profile.dateOfHire), "MMM dd, yyyy") : "Not specified"}</span></div>
                </div>
                {profile.department && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Department</Label>
                    <div className="flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{profile.department.name} ({profile.department.code})</span></div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column ───────────────────────────────────────────────────── */}
        <div className="space-y-4 lg:space-y-6">

          {/* Subjects */}
          <Card>
            <CardHeader className="pb-2 lg:pb-4">
              <CardTitle className="text-sm lg:text-base">Subjects</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {profile.subjects && profile.subjects.length > 0 ? (
                <div className="divide-y lg:divide-y-0 lg:space-y-2">
                  {profile.subjects.map((subject) => (
                    <div key={subject.id} className="flex items-center justify-between py-2.5 lg:py-0 lg:p-2 lg:border lg:rounded-md">
                      <span className="text-sm font-medium">{subject.name}</span>
                      <span className="text-xs text-muted-foreground">{subject.code}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-1">No subjects assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Class Teacher Assignment */}
          <Card>
            <CardHeader className="pb-2 lg:pb-4">
              <CardTitle className="text-sm lg:text-base">Class Assignment</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {profile.classTeacherAssignment ? (
                <div className="flex items-center justify-between py-1 lg:p-3 lg:border lg:rounded-md">
                  <span className="text-sm font-medium">
                    {profile.classTeacherAssignment.gradeLevel} — {profile.classTeacherAssignment.className}
                  </span>
                  <span className="text-xs text-muted-foreground bg-primary/5 px-2 py-0.5 rounded-full shrink-0 ml-2">Class Teacher</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-1">No class assignment</p>
              )}
            </CardContent>
          </Card>

          {/* Change Password */}
          <ChangePasswordCard />
        </div>
      </div>
    </div>
  );
}
