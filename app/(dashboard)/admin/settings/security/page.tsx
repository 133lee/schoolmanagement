"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Shield, Lock, Key, AlertTriangle, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Security Settings Page
 * Password policies, session management, and security settings
 */

interface SecuritySettings {
  // Password Policy
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  passwordExpiryDays: number;
  preventPasswordReuse: number; // number of previous passwords to check

  // Account Security
  maxLoginAttempts: number;
  lockoutDuration: number; // minutes
  require2FA: boolean;
  require2FAForAdmins: boolean;

  // Session Management
  sessionTimeout: number; // minutes
  maxConcurrentSessions: number;
  forceLogoutOnPasswordChange: boolean;

  // Security Features
  enableIPWhitelist: boolean;
  enableAuditLog: boolean;
  enableSecurityAlerts: boolean;
  alertOnSuspiciousActivity: boolean;

  // Data Protection
  enableDataEncryption: boolean;
  enableAutoBackup: boolean;
  backupFrequency: string;
  dataRetentionDays: number;
}

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState<SecuritySettings>({
    // Password Policy
    minPasswordLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordExpiryDays: 90,
    preventPasswordReuse: 5,

    // Account Security
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    require2FA: false,
    require2FAForAdmins: true,

    // Session Management
    sessionTimeout: 60,
    maxConcurrentSessions: 3,
    forceLogoutOnPasswordChange: true,

    // Security Features
    enableIPWhitelist: false,
    enableAuditLog: true,
    enableSecurityAlerts: true,
    alertOnSuspiciousActivity: true,

    // Data Protection
    enableDataEncryption: true,
    enableAutoBackup: true,
    backupFrequency: "daily",
    dataRetentionDays: 365,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/settings/security", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load security settings");
      }

      const data = await response.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed to load security settings:", error);
      toast.error("Failed to load security settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (field: keyof SecuritySettings) => {
    setSettings((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (field: keyof SecuritySettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const getPasswordStrength = (): string => {
    let score = 0;
    if (settings.minPasswordLength >= 8) score++;
    if (settings.minPasswordLength >= 12) score++;
    if (settings.requireUppercase) score++;
    if (settings.requireLowercase) score++;
    if (settings.requireNumbers) score++;
    if (settings.requireSpecialChars) score++;

    if (score <= 2) return "Weak";
    if (score <= 4) return "Medium";
    return "Strong";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Skeleton className="h-9 w-20" /><Skeleton className="h-7 w-44" /></div>
        {[0, 1, 2].map(i => (
          <Card key={i}><CardContent className="pt-6 space-y-4">
            <Skeleton className="h-5 w-36" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
            ))}
          </CardContent></Card>
        ))}
        <Skeleton className="h-9 w-24" />
      </div>
    );
  }

  const passwordStrength = getPasswordStrength();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Security Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure password policies, authentication, and security features
            </p>
          </div>
        </div>
      </div>

      {/* Not yet enforced — every setting below is stored but not read by any
          real code path (password policy, lockout, sessions, audit log, 2FA,
          encryption, backups). Disabling the whole section rather than
          leaving it interactive, since toggling any of these currently does
          nothing and would otherwise look like it does. */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Not yet enforced.</strong> These settings are disabled because nothing in the
          system currently reads or applies them — changing them would have no real effect.
          This section will be re-enabled once the underlying features are actually built.
        </AlertDescription>
      </Alert>

      <div className="opacity-60 pointer-events-none select-none space-y-6" aria-disabled="true">

      {/* Password Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Password Policy
          </CardTitle>
          <CardDescription>
            Define password requirements for all user accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minPasswordLength">Minimum Password Length</Label>
            <Input
              id="minPasswordLength"
              type="number"
              min="6"
              max="20"
              value={settings.minPasswordLength}
              onChange={(e) => handleChange("minPasswordLength", Number(e.target.value))}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 8 or more characters
            </p>
          </div>

          <div className="space-y-3">
            <Label>Password Requirements</Label>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-normal">Require Uppercase Letters (A-Z)</Label>
                <p className="text-sm text-muted-foreground">
                  At least one uppercase letter
                </p>
              </div>
              <Switch
                checked={settings.requireUppercase}
                onCheckedChange={() => handleToggle("requireUppercase")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-normal">Require Lowercase Letters (a-z)</Label>
                <p className="text-sm text-muted-foreground">
                  At least one lowercase letter
                </p>
              </div>
              <Switch
                checked={settings.requireLowercase}
                onCheckedChange={() => handleToggle("requireLowercase")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-normal">Require Numbers (0-9)</Label>
                <p className="text-sm text-muted-foreground">
                  At least one numeric digit
                </p>
              </div>
              <Switch
                checked={settings.requireNumbers}
                onCheckedChange={() => handleToggle("requireNumbers")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-normal">Require Special Characters (!@#$%)</Label>
                <p className="text-sm text-muted-foreground">
                  At least one special character
                </p>
              </div>
              <Switch
                checked={settings.requireSpecialChars}
                onCheckedChange={() => handleToggle("requireSpecialChars")}
              />
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Password Strength:</span>
              <span className={`text-sm font-bold ${
                passwordStrength === "Strong" ? "text-green-600" :
                passwordStrength === "Medium" ? "text-yellow-600" :
                "text-red-600"
              }`}>
                {passwordStrength}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="passwordExpiryDays">Password Expires After (days)</Label>
              <select
                id="passwordExpiryDays"
                value={settings.passwordExpiryDays}
                onChange={(e) => handleChange("passwordExpiryDays", Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="0">Never</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preventPasswordReuse">Prevent Password Reuse</Label>
              <select
                id="preventPasswordReuse"
                value={settings.preventPasswordReuse}
                onChange={(e) => handleChange("preventPasswordReuse", Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="0">Disabled</option>
                <option value="3">Last 3 passwords</option>
                <option value="5">Last 5 passwords</option>
                <option value="10">Last 10 passwords</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Account Security
          </CardTitle>
          <CardDescription>
            Login protection and account lockout settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Maximum Login Attempts</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                min="3"
                max="10"
                value={settings.maxLoginAttempts}
                onChange={(e) => handleChange("maxLoginAttempts", Number(e.target.value))}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Lock account after this many failed attempts
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
              <select
                id="lockoutDuration"
                value={settings.lockoutDuration}
                onChange={(e) => handleChange("lockoutDuration", Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="1440">24 hours</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Two-Factor Authentication (2FA)</Label>
              <p className="text-sm text-muted-foreground">
                All users must enable 2FA to access the system
              </p>
            </div>
            <Switch
              checked={settings.require2FA}
              onCheckedChange={() => handleToggle("require2FA")}
              disabled
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require 2FA for Administrators</Label>
              <p className="text-sm text-muted-foreground">
                Admin and Head Teacher accounts must use 2FA
              </p>
            </div>
            <Switch
              checked={settings.require2FAForAdmins}
              onCheckedChange={() => handleToggle("require2FAForAdmins")}
              disabled
            />
          </div>

          {(settings.require2FA || settings.require2FAForAdmins) && (
            <Alert>
              <AlertDescription className="text-xs">
                Two-factor authentication feature is coming soon. Enable this setting to prepare for future rollout.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Session Management
          </CardTitle>
          <CardDescription>
            Control user sessions and concurrent logins
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <select
                id="sessionTimeout"
                value={settings.sessionTimeout}
                onChange={(e) => handleChange("sessionTimeout", Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="480">8 hours</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxConcurrentSessions">Max Concurrent Sessions</Label>
              <select
                id="maxConcurrentSessions"
                value={settings.maxConcurrentSessions}
                onChange={(e) => handleChange("maxConcurrentSessions", Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="1">1 session (Single device)</option>
                <option value="2">2 sessions</option>
                <option value="3">3 sessions</option>
                <option value="5">5 sessions</option>
                <option value="0">Unlimited</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Force Logout on Password Change</Label>
              <p className="text-sm text-muted-foreground">
                Automatically log out all sessions when password is changed
              </p>
            </div>
            <Switch
              checked={settings.forceLogoutOnPasswordChange}
              onCheckedChange={() => handleToggle("forceLogoutOnPasswordChange")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Features
          </CardTitle>
          <CardDescription>
            Advanced security monitoring and protection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>IP Whitelist (Coming Soon)</Label>
              <p className="text-sm text-muted-foreground">
                Only allow access from approved IP addresses
              </p>
            </div>
            <Switch
              checked={settings.enableIPWhitelist}
              onCheckedChange={() => handleToggle("enableIPWhitelist")}
              disabled
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Audit Log</Label>
              <p className="text-sm text-muted-foreground">
                Record all security-sensitive actions for compliance
              </p>
            </div>
            <Switch
              checked={settings.enableAuditLog}
              onCheckedChange={() => handleToggle("enableAuditLog")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Security Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Notify administrators of security events
              </p>
            </div>
            <Switch
              checked={settings.enableSecurityAlerts}
              onCheckedChange={() => handleToggle("enableSecurityAlerts")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alert on Suspicious Activity</Label>
              <p className="text-sm text-muted-foreground">
                Detect and alert on unusual login patterns or behavior
              </p>
            </div>
            <Switch
              checked={settings.alertOnSuspiciousActivity}
              onCheckedChange={() => handleToggle("alertOnSuspiciousActivity")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Protection */}
      <Card>
        <CardHeader>
          <CardTitle>Data Protection</CardTitle>
          <CardDescription>
            Encryption, backups, and data retention policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Data Encryption</Label>
              <p className="text-sm text-muted-foreground">
                Encrypt sensitive data at rest and in transit
              </p>
            </div>
            <Switch
              checked={settings.enableDataEncryption}
              onCheckedChange={() => handleToggle("enableDataEncryption")}
              disabled
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Auto Backup</Label>
              <p className="text-sm text-muted-foreground">
                Automatically backup database on schedule
              </p>
            </div>
            <Switch
              checked={settings.enableAutoBackup}
              onCheckedChange={() => handleToggle("enableAutoBackup")}
            />
          </div>

          {settings.enableAutoBackup && (
            <div className="space-y-2 ml-4">
              <Label htmlFor="backupFrequency">Backup Frequency</Label>
              <select
                id="backupFrequency"
                value={settings.backupFrequency}
                onChange={(e) => handleChange("backupFrequency", e.target.value)}
                className="flex h-10 w-full md:w-1/2 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="hourly">Every Hour</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dataRetentionDays">Data Retention Period (days)</Label>
            <select
              id="dataRetentionDays"
              value={settings.dataRetentionDays}
              onChange={(e) => handleChange("dataRetentionDays", Number(e.target.value))}
              className="flex h-10 w-full md:w-1/2 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="90">90 days (3 months)</option>
              <option value="180">180 days (6 months)</option>
              <option value="365">365 days (1 year)</option>
              <option value="730">730 days (2 years)</option>
              <option value="1825">1825 days (5 years)</option>
              <option value="0">Indefinite</option>
            </select>
            <p className="text-xs text-muted-foreground">
              How long to keep old records before archiving or deletion
            </p>
          </div>
        </CardContent>
      </Card>

      </div>
    </div>
  );
}
