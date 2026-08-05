"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePermissions, UserWithPermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RoleAssignmentProps {
  user: UserWithPermissions;
  onUpdate: () => void;
}

// Permission mappings for each role
// NOTE: HOD is NOT a role - it's a position derived from Department.hodTeacherId
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    "Full System Access",
    "Create/Delete Users",
    "Manage Roles & Permissions",
    "Manage Academic Years",
    "View All Reports",
    "Delete Records",
  ],
  HEAD_TEACHER: [
    "Manage Teachers",
    "Approve Promotions",
    "View All Reports",
    "Manage Classes",
    "Manage Timetables",
    "Manage Assessments",
  ],
  DEPUTY_HEAD: [
    "Manage Classes",
    "Manage Timetables",
    "View Reports",
    "Mark Attendance",
    "Enter Results",
  ],
  TEACHER: [
    "Mark Attendance",
    "Enter Results",
    "View Own Classes",
    "View Student Records",
  ],
  CLERK: [
    "Create Students",
    "Update Student Records",
    "View Reports",
    "Manage Parents",
  ],
};

// NOTE: HOD is NOT included - it's a position, not a role
// To assign someone as HOD, use Department management to set hodTeacherId
const ROLES = [
  { value: "ADMIN", label: "Administrator", color: "destructive" },
  { value: "HEAD_TEACHER", label: "Head Teacher", color: "default" },
  { value: "DEPUTY_HEAD", label: "Deputy Head", color: "secondary" },
  { value: "TEACHER", label: "Teacher", color: "outline" },
  { value: "CLERK", label: "Clerk", color: "outline" },
] as const;

export function RoleAssignment({ user, onUpdate }: RoleAssignmentProps) {
  const { toast } = useToast();
  const { updateUserRole } = usePermissions();
  const [selectedRole, setSelectedRole] = useState<string>(user.role);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRoleChange = async () => {
    if (!selectedRole || selectedRole === user.role) return;

    // Safety check for ADMIN and HEAD_TEACHER
    if (user.role === "ADMIN" || user.role === "HEAD_TEACHER") {
      const confirmMessage = `Are you sure you want to change this user's role from ${user.role}? This is a critical role change.`;
      if (!confirm(confirmMessage)) {
        setSelectedRole(user.role);
        return;
      }
    }

    try {
      setIsUpdating(true);
      await updateUserRole(user.id, selectedRole);

      toast({
        title: "Role Updated",
        description: `User role has been changed to ${ROLES.find(r => r.value === selectedRole)?.label}`,
      });

      onUpdate();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update role",
        variant: "destructive",
      });
      setSelectedRole(user.role);
    } finally {
      setIsUpdating(false);
    }
  };

  const isRoleChanged = selectedRole !== user.role;
  const isCriticalRole = user.role === "ADMIN" || user.role === "HEAD_TEACHER";

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Role Assignment Column */}
      <Card>
        <CardHeader>
          <CardTitle>Role Assignment</CardTitle>
          <CardDescription>
            Change the user's role to adjust their system-wide permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current User Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">
                {user.profile
                  ? `${user.profile.firstName} ${user.profile.lastName}`
                  : user.email}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Critical Role Warning */}
          {isCriticalRole && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This user has a critical role ({user.role}). Changing their role may
                affect system administration capabilities. Proceed with caution.
              </AlertDescription>
            </Alert>
          )}

          {/* Role Selector */}
          <div className="space-y-2">
            <Label htmlFor="role">Assign Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Update Button */}
          <Button
            onClick={handleRoleChange}
            disabled={!isRoleChanged || isUpdating}
            className="w-full"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating Role...
              </>
            ) : (
              "Update Role"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Inherited Permissions Column */}
      <Card>
        <CardHeader>
          <CardTitle>Inherited Permissions</CardTitle>
          <CardDescription>
            Default permissions granted by the selected role
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {ROLE_PERMISSIONS[selectedRole]?.map((permission, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-sm">{permission}</span>
              </div>
            ))}
            {(!selectedRole || !ROLE_PERMISSIONS[selectedRole]) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Select a role to view inherited permissions
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
