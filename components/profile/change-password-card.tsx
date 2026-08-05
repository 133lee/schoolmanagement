"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return false;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return false;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      toast.success("Password changed successfully");

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to change password";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Change Password
        </CardTitle>
        <CardDescription className="text-xs">
          Update your password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-xs">
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={isLoading}
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

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-xs">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
                disabled={isLoading}
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

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={isLoading}
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
              <li className="flex items-center gap-2">
                <span className={newPassword.length >= 8 ? "text-green-600" : ""}>
                  {newPassword.length >= 8 ? "✓" : "•"}
                </span>
                At least 8 characters long
              </li>
              <li className="flex items-center gap-2">
                <span className={newPassword === confirmPassword && newPassword ? "text-green-600" : ""}>
                  {newPassword === confirmPassword && newPassword ? "✓" : "•"}
                </span>
                Passwords match
              </li>
              <li className="flex items-center gap-2">
                <span className={currentPassword && newPassword && currentPassword !== newPassword ? "text-green-600" : ""}>
                  {currentPassword && newPassword && currentPassword !== newPassword ? "✓" : "•"}
                </span>
                Different from current password
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={isLoading} size="sm">
              {isLoading ? "Changing..." : "Change Password"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
