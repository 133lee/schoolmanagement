"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { usePermissions, UserWithPermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Trash2, Calendar, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PermissionOverridesProps {
  user: UserWithPermissions;
  onUpdate: () => void;
}

// Permission enum codes MUST match Prisma Permission enum exactly
const PERMISSION_CATEGORIES = [
  {
    name: "Student Management",
    permissions: [
      { code: "CREATE_STUDENT", label: "Create Students" },
      { code: "READ_STUDENT",   label: "View Students" },
      { code: "UPDATE_STUDENT", label: "Edit Student Records" },
      { code: "DELETE_STUDENT", label: "Delete Students" },
    ],
  },
  {
    name: "Teacher Management",
    permissions: [
      { code: "CREATE_TEACHER", label: "Create Teachers" },
      { code: "READ_TEACHER",   label: "View Teachers" },
      { code: "UPDATE_TEACHER", label: "Edit Teacher Records" },
      { code: "DELETE_TEACHER", label: "Delete Teachers" },
    ],
  },
  {
    name: "Class Management",
    permissions: [
      { code: "CREATE_CLASS", label: "Create Classes" },
      { code: "READ_CLASS",   label: "View Classes" },
      { code: "UPDATE_CLASS", label: "Edit Classes" },
      { code: "DELETE_CLASS", label: "Delete Classes" },
    ],
  },
  {
    name: "Assessments",
    permissions: [
      { code: "CREATE_ASSESSMENT", label: "Create Assessments" },
      { code: "READ_ASSESSMENT",   label: "View Assessments" },
      { code: "UPDATE_ASSESSMENT", label: "Edit Assessments" },
      { code: "DELETE_ASSESSMENT", label: "Delete Assessments" },
      { code: "ENTER_RESULTS",     label: "Enter Results" },
    ],
  },
  {
    name: "Attendance",
    permissions: [
      { code: "MARK_ATTENDANCE", label: "Mark Attendance" },
      { code: "VIEW_ATTENDANCE", label: "View Attendance Records" },
    ],
  },
  {
    name: "Reports",
    permissions: [
      { code: "VIEW_REPORTS",     label: "View Reports" },
      { code: "GENERATE_REPORTS", label: "Generate Reports" },
    ],
  },
  {
    name: "SMS",
    permissions: [
      { code: "SEND_SMS",     label: "Send SMS Messages" },
      { code: "VIEW_SMS_LOGS", label: "View SMS Logs" },
    ],
  },
  {
    name: "System Administration",
    permissions: [
      { code: "MANAGE_ROLES",        label: "Manage User Roles" },
      { code: "MANAGE_PERMISSIONS",  label: "Manage Permissions" },
      { code: "MANAGE_ACADEMIC_YEAR",label: "Manage Academic Years" },
      { code: "MANAGE_TERMS",        label: "Manage Terms" },
      { code: "MANAGE_TIMETABLE",    label: "Manage Timetables" },
      { code: "APPROVE_PROMOTION",   label: "Approve Student Promotions" },
    ],
  },
];

export function PermissionOverrides({ user, onUpdate }: PermissionOverridesProps) {
  const { toast } = useToast();
  const { addPermissionOverride, removePermissionOverride } = usePermissions();
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const granted = new Set(user.userPermissions.map((p) => p.permission));
  const allAvailable = PERMISSION_CATEGORIES
    .flatMap((c) => c.permissions.map((p) => p.code))
    .filter((code) => !granted.has(code));

  const toggle = (code: string) => {
    if (granted.has(code)) return;
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSelectAll = () => {
    setSelected(selected.length === allAvailable.length ? [] : allAvailable);
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      toast({ title: "No permissions selected", variant: "destructive" });
      return;
    }
    if (!reason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }

    try {
      setIsSubmitting(true);
      for (const code of selected) {
        await addPermissionOverride(user.id, code, expiryDate ? new Date(expiryDate) : null, reason);
      }
      toast({ title: "Overrides saved", description: `${selected.length} permission(s) granted` });
      setSelected([]);
      setReason("");
      setExpiryDate("");
      onUpdate();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to save", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (permission: string) => {
    try {
      setIsRemoving(permission);
      await removePermissionOverride(user.id, permission);
      toast({ title: "Override removed" });
      onUpdate();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to remove", variant: "destructive" });
    } finally {
      setIsRemoving(null);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* ── Left: Grant new permissions ── */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-semibold">Grant Permissions</h3>
          <p className="text-sm text-muted-foreground">
            Select extra permissions to grant to{" "}
            <span className="font-medium text-foreground">
              {user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email}
            </span>
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selected.length} of {allAvailable.length} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={allAvailable.length === 0}>
              {selected.length === allAvailable.length ? "Deselect All" : "Select All"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])} disabled={selected.length === 0}>
              Clear
            </Button>
          </div>
        </div>

        {/* Permission list */}
        <div className="border rounded-lg overflow-hidden flex-1 min-h-0">
          <div className="overflow-y-auto max-h-72 p-2 space-y-3">
            {PERMISSION_CATEGORIES.map((category) => (
              <div key={category.name}>
                <div className="px-2 py-1.5 rounded-md bg-muted/60 mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {category.name}
                  </p>
                </div>
                <div className="space-y-0.5">
                  {category.permissions.map((perm) => {
                    const isGranted = granted.has(perm.code);
                    const isSelected = selected.includes(perm.code);
                    return (
                      <div
                        key={perm.code}
                        className={cn(
                          "flex items-center gap-3 px-2 py-2 rounded-md transition-colors",
                          isGranted
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:bg-accent",
                          isSelected && "bg-accent"
                        )}
                        onClick={() => toggle(perm.code)}
                      >
                        <Checkbox
                          checked={isGranted || isSelected}
                          disabled={isGranted}
                          onCheckedChange={() => toggle(perm.code)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className={cn("text-sm flex-1", isGranted && "line-through text-muted-foreground")}>
                          {perm.label}
                        </span>
                        {isGranted && (
                          <Badge variant="secondary" className="text-xs shrink-0">Already granted</Badge>
                        )}
                        {isSelected && !isGranted && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Reason + expiry */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Why are these permissions being granted?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expiry" className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Expiry Date <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={selected.length === 0 || isSubmitting}>
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
          ) : (
            `Grant ${selected.length > 0 ? `${selected.length} ` : ""}Permission${selected.length !== 1 ? "s" : ""}`
          )}
        </Button>
      </div>

      {/* ── Right: Current overrides ── */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-semibold">Active Overrides</h3>
          <p className="text-sm text-muted-foreground">
            Extra permissions currently granted to this user
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {user.userPermissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 border rounded-lg">
              <Shield className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No active overrides</p>
            </div>
          ) : (
            <div className="space-y-2">
              {user.userPermissions.map((up) => (
                <div key={up.id} className="p-3 border rounded-lg space-y-2 bg-muted/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-mono">{up.permission}</p>
                      {up.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate" title={up.reason}>
                          {up.reason}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => handleRemove(up.permission)}
                      disabled={isRemoving === up.permission}
                    >
                      {isRemoving === up.permission ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Granted {new Date(up.createdAt).toLocaleDateString()}</span>
                    {up.expiresAt && (
                      <Badge
                        variant={new Date(up.expiresAt) < new Date() ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        Expires {new Date(up.expiresAt).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
