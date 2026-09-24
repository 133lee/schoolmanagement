"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Save,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";

interface ProfileData {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  profile: {
    id: string;
    staffNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    address: string | null;
    qualification: string;
    yearsExperience: number;
  } | null;
}

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // Edit form state
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const result = await response.json();
      setProfileData(result.data);

      // Populate edit form
      if (result.data.profile) {
        setFirstName(result.data.profile.firstName || "");
        setMiddleName(result.data.profile.middleName || "");
        setLastName(result.data.profile.lastName || "");
        setPhone(result.data.profile.phone || "");
        setAddress(result.data.profile.address || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          middleName: middleName || null,
          lastName,
          phone,
          address: address || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      const result = await response.json();
      setProfileData(result.data);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(getErrorMessage(error, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    try {
      setChangingPassword(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/profile/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to change password");
      }

      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError(getErrorMessage(error, "Failed to change password"));
    } finally {
      setChangingPassword(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800";
      case "HEAD_TEACHER":
        return "bg-purple-100 text-purple-800";
      case "DEPUTY_HEAD":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 px-4 pb-10 lg:px-0 lg:space-y-6">
        {/* Mobile identity skeleton */}
        <div className="lg:hidden flex items-center gap-3 py-2">
          <Skeleton className="h-14 w-14 rounded-full shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        {/* Desktop header skeleton */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-28" /></div>
        </div>
        {[0, 1].map(i => (
          <Card key={i}><CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </CardContent></Card>
        ))}
        <Skeleton className="h-9 w-24" />
      </div>
    );
  }

  // Derive initials for mobile identity header
  const nameInitials = profileData?.profile
    ? `${profileData.profile.firstName[0] ?? ""}${profileData.profile.lastName[0] ?? ""}`.toUpperCase()
    : profileData?.email[0]?.toUpperCase() ?? "A";
  const displayName = profileData?.profile
    ? `${profileData.profile.firstName} ${profileData.profile.lastName}`
    : profileData?.email ?? "";
  const roleLabel = profileData?.role?.replace(/_/g, " ") ?? "";

  return (
    <div className="space-y-4 px-4 pb-10 lg:px-0 lg:space-y-6">
      {/* Desktop header — hidden on mobile (layout bar shows title) */}
      <div className="hidden lg:block mt-2">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account settings and personal information
        </p>
      </div>

      {/* ── Mobile identity header ─────────────────────────────────────────── */}
      <div className="lg:hidden flex items-center gap-3 py-2">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary select-none">{nameInitials}</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight truncate">{displayName}</h2>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{roleLabel.toLowerCase()}</p>
          {profileData?.profile && (
            <p className="text-xs text-muted-foreground truncate">{profileData.email}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Overview Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar + name — only shown on desktop (mobile identity header covers this) */}
            <div className="hidden lg:flex flex-col items-center py-4">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-12 w-12 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                {profileData?.profile
                  ? `${profileData.profile.firstName} ${profileData.profile.lastName}`
                  : profileData?.email}
              </h3>
              <Badge className={getRoleBadgeColor(profileData?.role || "")}>
                {profileData?.role?.replace("_", " ")}
              </Badge>
            </div>

            <Separator className="hidden lg:block" />

            {/* Account Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{profileData?.email}</span>
              </div>

              {profileData?.profile && (
                <>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profileData.profile.phone}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Staff #: {profileData.profile.staffNumber}
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Last login: {formatDate(profileData?.lastLogin || null)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal details here
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profileData?.profile ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="Middle name (optional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Address (optional)"
                    />
                  </div>
                </div>

                {/* Read-only fields */}
                <Separator className="my-4" />
                <p className="text-sm text-muted-foreground mb-3">
                  The following fields cannot be changed here
                </p>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date of Birth
                    </Label>
                    <Input
                      value={
                        profileData.profile.dateOfBirth
                          ? new Date(profileData.profile.dateOfBirth).toLocaleDateString()
                          : ""
                      }
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Qualification
                    </Label>
                    <Input
                      value={profileData.profile.qualification?.replace("_", " ") || ""}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Years Experience
                    </Label>
                    <Input
                      value={`${profileData.profile.yearsExperience} years`}
                      disabled
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No profile information available</p>
                <p className="text-sm">
                  Contact an administrator to set up your profile
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Manage your password and security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <Button
                variant="outline"
                onClick={() => setShowPasswordForm(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            ) : (
              <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                {passwordError && (
                  <Alert variant="destructive">
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 8 characters)"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-muted/50 rounded-md p-3">
                  <p className="text-xs font-medium mb-2">Password Requirements:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className={newPassword.length >= 8 ? "text-green-600" : ""}>
                      {newPassword.length >= 8 ? "✓" : "•"} At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(newPassword) ? "text-green-600" : ""}>
                      {/[A-Z]/.test(newPassword) ? "✓" : "•"} One uppercase letter
                    </li>
                    <li className={/[a-z]/.test(newPassword) ? "text-green-600" : ""}>
                      {/[a-z]/.test(newPassword) ? "✓" : "•"} One lowercase letter
                    </li>
                    <li className={/[0-9]/.test(newPassword) ? "text-green-600" : ""}>
                      {/[0-9]/.test(newPassword) ? "✓" : "•"} One number
                    </li>
                    <li
                      className={
                        newPassword === confirmPassword && newPassword
                          ? "text-green-600"
                          : ""
                      }
                    >
                      {newPassword === confirmPassword && newPassword ? "✓" : "•"}{" "}
                      Passwords match
                    </li>
                  </ul>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={changingPassword}>
                    {changingPassword && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Change Password
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordError(null);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
