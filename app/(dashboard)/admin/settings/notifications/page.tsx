"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatCompactClassLabel } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, MessageSquare, CheckCircle, XCircle, RefreshCw,
  AlertCircle, Smartphone, Eye, EyeOff, Save, Send, Zap,
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, BookTemplate,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

type Provider = "SMS_GATEWAY" | "AFRICAS_TALKING";
type RecipientType = "ALL" | "GRADE" | "CLASS" | "INDIVIDUAL";

interface SmsSettings {
  activeProvider: Provider;
  smsgateway: { username: string; deviceId: string; passwordMasked: string; configured: boolean };
  africastalking: {
    username: string; senderId: string; environment: string;
    apiKeyMasked: string; configured: boolean;
  };
}

interface SmsTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  template: string;
  variables: string[];
  isActive: boolean;
}

interface SmsLog {
  id: string;
  phoneNumber: string;
  message: string;
  status: "PENDING" | "SENT" | "DELIVERED" | "FAILED";
  provider: Provider;
  sentAt: string | null;
  createdAt: string;
  error: string | null;
  guardian: { firstName: string; lastName: string };
}

// ── Small helpers ──────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  academic: "bg-blue-100 text-blue-700",
  attendance: "bg-amber-100 text-amber-700",
  finance: "bg-green-100 text-green-700",
  general: "bg-purple-100 text-purple-700",
};

function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground"}`}>
      {cat}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SENT: "bg-green-100 text-green-700",
    DELIVERED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    PENDING: "bg-yellow-100 text-yellow-700",
  };
  return <Badge className={map[status] ?? ""}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

const BLANK_TEMPLATE = { name: "", description: "", category: "general", template: "", variables: "" };

// ── Page ───────────────────────────────────────────────────────────────────────

export default function NotificationsSettingsPage() {
  const tok = () => typeof window !== "undefined" ? localStorage.getItem("auth_token") ?? "" : "";

  // ── settings state ──
  const [settings, setSettings] = useState<SmsSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [connStatus, setConnStatus] = useState<Record<Provider, { success: boolean; message: string } | null>>({
    SMS_GATEWAY: null, AFRICAS_TALKING: null,
  });
  const [testing, setTesting] = useState<Provider | null>(null);
  const [saving, setSaving] = useState<Provider | null>(null);
  const [savingProvider, setSavingProvider] = useState(false);

  // SMS Gateway (Android, Cloud Mode) form
  const [gwUsername, setGwUsername] = useState("");
  const [gwPassword, setGwPassword] = useState("");
  const [gwDeviceId, setGwDeviceId] = useState("");
  const [showGwPassword, setShowGwPassword] = useState(false);

  // AT form
  const [atUsername, setAtUsername] = useState("");
  const [atApiKey, setAtApiKey] = useState("");
  const [atSenderId, setAtSenderId] = useState("");
  const [atEnv, setAtEnv] = useState<"sandbox" | "production">("sandbox");
  const [showAtKey, setShowAtKey] = useState(false);

  // ── logs state ──
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ── templates state ──
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<typeof BLANK_TEMPLATE>(BLANK_TEMPLATE);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<typeof BLANK_TEMPLATE>(BLANK_TEMPLATE);
  const [seeding, setSeeding] = useState(false);

  // ── compose state ──
  const [composeText, setComposeText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null);
  const [composeProvider, setComposeProvider] = useState<Provider>("SMS_GATEWAY");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // ── recipient state ──
  const [recipientType, setRecipientType] = useState<RecipientType>("ALL");
  const [grades, setGrades] = useState<Array<{ id: string; name: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; gradeName: string }>>([]);
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [preview, setPreview] = useState<{ total: number; withPhone: number; sample: Array<{ name: string; phone: string; studentName: string }> } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number; noPhone: number } | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);

  // test send
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);

  // ── loaders ──
  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/admin/settings/sms", { headers: { Authorization: `Bearer ${tok()}` } });
      if (res.ok) {
        const d = await res.json();
        const s: SmsSettings = d.data;
        setSettings(s);
        setGwUsername(s.smsgateway.username || "");
        setGwDeviceId(s.smsgateway.deviceId || "");
        setAtUsername(s.africastalking.username || "");
        setAtSenderId(s.africastalking.senderId || "");
        setAtEnv((s.africastalking.environment as "sandbox" | "production") || "sandbox");
        setComposeProvider(s.activeProvider);
      }
    } finally { setLoadingSettings(false); }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/sms/logs?pageSize=12", { headers: { Authorization: `Bearer ${tok()}` } });
      if (res.ok) { const d = await res.json(); setLogs(d.data?.logs ?? []); }
    } finally { setLoadingLogs(false); }
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/sms/templates", { headers: { Authorization: `Bearer ${tok()}` } });
      if (res.ok) { const d = await res.json(); setTemplates(d.data ?? []); }
    } finally { setLoadingTemplates(false); }
  }, []);

  const loadGradesAndClasses = useCallback(async () => {
    const [gr, cl] = await Promise.all([
      fetch("/api/grade-levels", { headers: { Authorization: `Bearer ${tok()}` } }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/classes?mode=all", { headers: { Authorization: `Bearer ${tok()}` } }).then((r) => r.json()).catch(() => ({})),
    ]);
    setGrades(gr.data?.map((g: any) => ({ id: g.id, name: g.name })) ?? []);
    setClasses(cl.data?.map((c: any) => ({ id: c.id, name: c.name, gradeName: c.grade?.name ?? "" })) ?? []);
  }, []);

  useEffect(() => { loadSettings(); loadLogs(); loadTemplates(); loadGradesAndClasses(); }, [loadSettings, loadLogs, loadTemplates, loadGradesAndClasses]);

  // fetch preview whenever recipient selection changes
  useEffect(() => {
    setPreview(null);
    setConfirmStep(false);
    setBroadcastResult(null);
    const params = new URLSearchParams({ type: recipientType });
    if (recipientType === "GRADE" && selectedGradeId) params.set("gradeId", selectedGradeId);
    if (recipientType === "CLASS" && selectedClassId) params.set("classId", selectedClassId);
    if (recipientType === "ALL" || (recipientType === "GRADE" && selectedGradeId) || (recipientType === "CLASS" && selectedClassId)) {
      setLoadingPreview(true);
      fetch(`/api/sms/broadcast/preview?${params}`, { headers: { Authorization: `Bearer ${tok()}` } })
        .then((r) => r.json()).then((d) => { if (d.data) setPreview(d.data); })
        .catch(() => null).finally(() => setLoadingPreview(false));
    }
  }, [recipientType, selectedGradeId, selectedClassId]);

  // ── handlers: gateway ──
  const handleSave = async (p: Provider) => {
    setSaving(p);
    try {
      const body: Record<string, string> = {};
      if (p === "SMS_GATEWAY") {
        if (gwUsername.trim()) body.smsgateway_username = gwUsername.trim();
        if (gwPassword.trim()) body.smsgateway_password = gwPassword.trim();
        body.smsgateway_deviceId = gwDeviceId.trim();
      } else {
        if (atUsername.trim()) body.at_username = atUsername.trim();
        if (atApiKey.trim()) body.at_apiKey = atApiKey.trim();
        body.at_senderId = atSenderId.trim();
        body.at_environment = atEnv;
      }
      if (!Object.keys(body).length) { toast.info("Nothing to save."); return; }
      const res = await fetch("/api/admin/settings/sms", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("Credentials saved.");
        if (p === "SMS_GATEWAY") setGwPassword(""); else setAtApiKey("");
        loadSettings();
      } else { toast.error("Failed to save."); }
    } finally { setSaving(null); }
  };

  const handleSetActive = async (p: Provider) => {
    setSavingProvider(true);
    try {
      const res = await fetch("/api/admin/settings/sms", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ activeProvider: p }),
      });
      if (res.ok) { toast.success(`Switched to ${p === "SMS_GATEWAY" ? "SMS Gateway" : "Africa's Talking"}`); loadSettings(); }
    } finally { setSavingProvider(false); }
  };

  const handleTest = async (p: Provider) => {
    setTesting(p);
    setConnStatus((prev) => ({ ...prev, [p]: null }));
    try {
      const res = await fetch(`/api/sms/test?provider=${p}`, { headers: { Authorization: `Bearer ${tok()}` } });
      if (res.ok) {
        const d = await res.json();
        setConnStatus((prev) => ({ ...prev, [p]: d.data }));
        d.data.success ? toast.success("Connection successful!") : toast.error(d.data.message);
      }
    } finally { setTesting(null); }
  };

  // ── handlers: compose ──
  const handlePickTemplate = (t: SmsTemplate) => {
    setSelectedTemplate(t);
    setComposeText(t.template);
  };

  const handleBroadcast = async () => {
    if (!composeText.trim()) { toast.error("Message is empty."); return; }
    if (recipientType === "GRADE" && !selectedGradeId) { toast.error("Select a grade."); return; }
    if (recipientType === "CLASS" && !selectedClassId) { toast.error("Select a class."); return; }
    if (!confirmStep) { setConfirmStep(true); return; }

    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const body: any = { message: composeText.trim(), provider: composeProvider, recipientType };
      if (recipientType === "GRADE") body.gradeId = selectedGradeId;
      if (recipientType === "CLASS") body.classId = selectedClassId;

      const res = await fetch("/api/sms/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        const r = d.data;
        setBroadcastResult(r);
        toast.success(`Broadcast complete — ${r.sent} sent, ${r.failed} failed`);
        setConfirmStep(false);
        loadLogs();
      } else {
        toast.error(d.error || "Broadcast failed.");
        setConfirmStep(false);
      }
    } finally { setBroadcasting(false); }
  };

  const handleTestSend = async () => {
    if (!testPhone.trim()) { toast.error("Enter a phone number."); return; }
    if (!composeText.trim()) { toast.error("Message is empty."); return; }
    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/settings/sms/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ phone: testPhone.trim(), message: composeText.trim(), provider: composeProvider }),
      });
      const d = await res.json();
      if (res.ok && d.data?.success) { toast.success(`Test sent to ${testPhone}`); loadLogs(); }
      else { toast.error(d.data?.error || "Failed to send test."); }
    } finally { setSendingTest(false); }
  };

  // ── handlers: templates ──
  const handleToggle = async (t: SmsTemplate) => {
    const res = await fetch(`/api/sms/templates/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    if (res.ok) { toast.success(t.isActive ? "Template deactivated." : "Template activated."); loadTemplates(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const res = await fetch(`/api/sms/templates/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${tok()}` },
    });
    if (res.ok) { toast.success("Template deleted."); loadTemplates(); }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const vars = editForm.variables.split(",").map((v) => v.trim()).filter(Boolean);
    const res = await fetch(`/api/sms/templates/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
      body: JSON.stringify({ ...editForm, variables: vars }),
    });
    if (res.ok) { toast.success("Template updated."); setEditingId(null); loadTemplates(); }
    else { toast.error("Failed to update."); }
  };

  const handleCreate = async () => {
    if (!newForm.name.trim() || !newForm.template.trim()) { toast.error("Name and message body are required."); return; }
    const vars = newForm.variables.split(",").map((v) => v.trim()).filter(Boolean);
    const res = await fetch("/api/sms/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
      body: JSON.stringify({ ...newForm, variables: vars, isActive: true }),
    });
    if (res.ok) { toast.success("Template created."); setShowNewForm(false); setNewForm(BLANK_TEMPLATE); loadTemplates(); }
    else { toast.error("Failed to create template."); }
  };

  const handleSeed = async () => {
    setSeeding(true);
    const res = await fetch("/api/sms/templates/seed", {
      method: "POST", headers: { Authorization: `Bearer ${tok()}` },
    });
    if (res.ok) { toast.success("Default templates added."); loadTemplates(); }
    else { toast.error("Seed failed."); }
    setSeeding(false);
  };

  const categories = ["all", ...Array.from(new Set(templates.map((t) => t.category)))];
  const visibleTemplates = filterCategory === "all"
    ? templates
    : templates.filter((t) => t.category === filterCategory);

  if (loadingSettings) {
    return (
      <div className="space-y-4 px-4 lg:px-0">
        <div className="flex items-center gap-4 mt-5 lg:mt-0">
          <Link href="/admin/settings"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="space-y-1">
            <div className="h-5 w-44 bg-muted rounded animate-pulse" />
            <div className="h-3 w-56 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  const activeProvider = settings?.activeProvider ?? "AFRICAS_TALKING";

  return (
    <div className="space-y-5 px-4 lg:px-0">
      {/* ── Header — title hidden on mobile (top bar shows "Notifications") ── */}
      <div className="flex items-center justify-between mt-5 lg:mt-1">
        <Link href="/admin/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Back to Settings</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>
        <div className="hidden lg:block text-right">
          <h1 className="text-xl font-bold">Notification Settings</h1>
          <p className="text-sm text-muted-foreground">SMS gateways and message templates</p>
        </div>
      </div>

      <Tabs defaultValue="setup">
        <div className="flex items-center justify-between gap-2">
          <TabsList className="w-full lg:w-fit">
            <TabsTrigger value="setup" className="gap-2">
              <Settings2 className="h-4 w-4" /><span className="hidden sm:inline">Gateway Setup</span><span className="sm:hidden">Setup</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" /><span className="hidden sm:inline">Compose & Templates</span><span className="sm:hidden">Messages</span>
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => { loadSettings(); loadLogs(); loadTemplates(); }} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1 — GATEWAY SETUP
        ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="setup" className="mt-4">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

            {/* LEFT — config (3 cols) */}
            <div className="xl:col-span-3 space-y-5">

              {/* Active provider selector */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />Active Gateway
                  </CardTitle>
                  <CardDescription>All outgoing messages will use this provider</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-2.5 lg:gap-3">
                    {(["SMS_GATEWAY", "AFRICAS_TALKING"] as Provider[]).map((p) => {
                      const isActive = activeProvider === p;
                      const configured = p === "SMS_GATEWAY" ? settings?.smsgateway.configured : settings?.africastalking.configured;
                      return (
                        <button key={p} onClick={() => !isActive && handleSetActive(p)}
                          disabled={savingProvider || isActive}
                          className={`flex-1 flex items-center gap-3 p-3 lg:p-4 rounded-xl border-2 transition-all text-left
                            ${isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/50 cursor-pointer"}`}
                        >
                          {p === "SMS_GATEWAY"
                            ? <Smartphone className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                            : <MessageSquare className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                          }
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{p === "SMS_GATEWAY" ? "SMS Gateway" : "Africa's Talking"}</div>
                            <div className="text-xs text-muted-foreground">{p === "SMS_GATEWAY" ? "Android gateway · free cloud relay · SIM credits" : "Cloud API · pay-per-message"}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {isActive && <Badge className="bg-primary/10 text-primary text-xs">Active</Badge>}
                            <div className={`text-xs flex items-center gap-1 ${configured ? "text-green-600" : "text-muted-foreground"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${configured ? "bg-green-500" : "bg-muted-foreground"}`} />
                              {configured ? "Ready" : "Not set"}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* SMS Gateway (Android, Cloud Mode) */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">SMS Gateway (Android)</CardTitle>
                        <CardDescription className="text-xs">Android phone as SMS gateway via free cloud relay — uses SIM airtime only</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {connStatus.SMS_GATEWAY && (connStatus.SMS_GATEWAY.success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />)}
                      {settings?.smsgateway.configured && <Badge variant="outline" className="text-xs text-green-600 border-green-200">Configured</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {settings?.smsgateway.configured && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/40 rounded-lg">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      {settings.smsgateway.username} · <span className="font-mono">{settings.smsgateway.passwordMasked}</span>
                      {settings.smsgateway.deviceId && <> · Device: <span className="font-mono">{settings.smsgateway.deviceId}</span></>}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Username</Label>
                      <Input placeholder="from the app's Cloud Mode screen" value={gwUsername} onChange={(e) => setGwUsername(e.target.value)} className="font-mono text-xs h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Password</Label>
                      <div className="relative">
                        <Input type={showGwPassword ? "text" : "password"} placeholder={settings?.smsgateway.configured ? "Leave blank to keep" : "from the app's Cloud Mode screen"}
                          value={gwPassword} onChange={(e) => setGwPassword(e.target.value)}
                          className="pr-9 font-mono text-xs h-9" />
                        <button type="button" onClick={() => setShowGwPassword((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showGwPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Device ID <span className="text-muted-foreground">(optional — pins sends to one phone)</span></Label>
                    <Input placeholder="from the app's device list" value={gwDeviceId} onChange={(e) => setGwDeviceId(e.target.value)} className="font-mono text-xs h-9" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button onClick={() => handleSave("SMS_GATEWAY")} disabled={saving === "SMS_GATEWAY"} size="sm" className="h-8 text-xs">
                      <Save className="h-3.5 w-3.5 mr-1.5" />{saving === "SMS_GATEWAY" ? "Saving..." : "Save"}
                    </Button>
                    <Button onClick={() => handleTest("SMS_GATEWAY")} disabled={testing === "SMS_GATEWAY" || !settings?.smsgateway.configured} variant="outline" size="sm" className="h-8 text-xs">
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />{testing === "SMS_GATEWAY" ? "Testing..." : "Test Connection"}
                    </Button>
                    {connStatus.SMS_GATEWAY && (
                      <p className={`text-xs ${connStatus.SMS_GATEWAY.success ? "text-green-600" : "text-red-600"}`}>
                        {connStatus.SMS_GATEWAY.message}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Africa's Talking */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/50">
                        <MessageSquare className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">Africa's Talking</CardTitle>
                        <CardDescription className="text-xs">Cloud SMS API — pay-per-message</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {connStatus.AFRICAS_TALKING && (connStatus.AFRICAS_TALKING.success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />)}
                      {settings?.africastalking.configured && <Badge variant="outline" className="text-xs text-green-600 border-green-200">Configured</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {settings?.africastalking.configured && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/40 rounded-lg">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      {settings.africastalking.username} · <span className="font-mono">{settings.africastalking.apiKeyMasked}</span>
                      · <span className="capitalize">{settings.africastalking.environment}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Environment</Label>
                    <div className="flex gap-2">
                      {(["sandbox", "production"] as const).map((e) => (
                        <button key={e} onClick={() => setAtEnv(e)}
                          className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all
                            ${atEnv === e ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"}`}>
                          {e.charAt(0).toUpperCase() + e.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Username</Label>
                      <Input placeholder="your-username" value={atUsername} onChange={(e) => setAtUsername(e.target.value)} className="font-mono text-xs h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sender ID <span className="text-muted-foreground">(optional)</span></Label>
                      <Input placeholder="SCHOOL" value={atSenderId} onChange={(e) => setAtSenderId(e.target.value)} className="font-mono text-xs h-9" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">API Key</Label>
                    <div className="relative">
                      <Input type={showAtKey ? "text" : "password"} placeholder={settings?.africastalking.configured ? "Leave blank to keep" : "atsk_xxxxxxxx..."}
                        value={atApiKey} onChange={(e) => setAtApiKey(e.target.value)}
                        className="pr-9 font-mono text-xs h-9" />
                      <button type="button" onClick={() => setShowAtKey((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showAtKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button onClick={() => handleSave("AFRICAS_TALKING")} disabled={saving === "AFRICAS_TALKING"} size="sm" className="h-8 text-xs">
                      <Save className="h-3.5 w-3.5 mr-1.5" />{saving === "AFRICAS_TALKING" ? "Saving..." : "Save"}
                    </Button>
                    <Button onClick={() => handleTest("AFRICAS_TALKING")} disabled={testing === "AFRICAS_TALKING" || !settings?.africastalking.configured} variant="outline" size="sm" className="h-8 text-xs">
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />{testing === "AFRICAS_TALKING" ? "Testing..." : "Test Connection"}
                    </Button>
                    {connStatus.AFRICAS_TALKING && (
                      <p className={`text-xs ${connStatus.AFRICAS_TALKING.success ? "text-green-600" : "text-red-600"}`}>
                        {connStatus.AFRICAS_TALKING.message}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT — recent activity (2 cols) */}
            <div className="xl:col-span-2">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                      <CardDescription className="text-xs">Last 12 messages sent</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadLogs} disabled={loadingLogs}>
                      <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingLogs ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground px-4">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">No messages sent yet</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {logs.map((log) => (
                        <div key={log.id} className="px-4 py-2.5 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">
                                {log.guardian.firstName} {log.guardian.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">{log.phoneNumber}</p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-[180px]">{log.message}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <StatusBadge status={log.status} />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {log.sentAt ? formatDate(log.sentAt) : "—"}
                              </span>
                              <Badge variant="outline" className="text-xs py-0">
                                {log.provider === "SMS_GATEWAY" ? "SMS Gateway" : log.provider === "AFRICAS_TALKING" ? "AT" : log.provider}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════
            TAB 2 — COMPOSE & TEMPLATES
        ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="messages" className="mt-4">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

            {/* LEFT — compose (3 cols) */}
            <div className="xl:col-span-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="h-4 w-4" />Compose Message
                  </CardTitle>
                  <CardDescription>Write or pick a template, then send a test to any number</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Template quick-pick chips — academic templates excluded; use Report Cards > Notify Parents for results */}
                  {templates.filter((t) => t.isActive && t.category !== "academic").length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quick-pick template</Label>
                      <div className="flex flex-wrap gap-2">
                        {templates.filter((t) => t.isActive && t.category !== "academic").map((t) => (
                          <button key={t.id} onClick={() => handlePickTemplate(t)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                              ${selectedTemplate?.id === t.id
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/40 hover:bg-muted/50"
                              }`}
                          >
                            {t.name.replace(/_/g, " ")}
                          </button>
                        ))}
                        {selectedTemplate && (
                          <button onClick={() => { setSelectedTemplate(null); setComposeText(""); }}
                            className="px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground">
                            ✕ Clear
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        For academic results, use <strong>Report Cards → Notify Parents</strong> which attaches actual scores per student.
                      </p>
                      {selectedTemplate && (
                        <p className="text-xs text-muted-foreground">
                          Variables in <span className="font-mono">{"{curly braces}"}</span> will be replaced per recipient when sending in bulk.
                        </p>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Message body */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Message Body</Label>
                      <span className="text-xs text-muted-foreground">{composeText.length} / 1600 chars</span>
                    </div>
                    <Textarea
                      placeholder="Type your message here, or pick a template above..."
                      value={composeText}
                      onChange={(e) => setComposeText(e.target.value)}
                      className="min-h-[140px] font-mono text-sm resize-none"
                    />
                  </div>

                  <Separator />

                  {/* Provider */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Gateway</Label>
                    <div className="flex gap-2">
                      {(["SMS_GATEWAY", "AFRICAS_TALKING"] as Provider[]).map((p) => (
                        <button key={p} onClick={() => { setComposeProvider(p); setConfirmStep(false); }}
                          className={`flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all
                            ${composeProvider === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}>
                          {p === "SMS_GATEWAY" ? "SMS Gateway" : "Africa's Talking"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recipient selector */}
                  <div className="space-y-2">
                    <Label className="text-xs">Send To</Label>
                    <div className="flex flex-wrap gap-2">
                      {(["ALL", "GRADE", "CLASS"] as RecipientType[]).map((t) => (
                        <button key={t} onClick={() => { setRecipientType(t); setConfirmStep(false); setBroadcastResult(null); }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                            ${recipientType === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}>
                          {t === "ALL" ? "All Parents" : t === "GRADE" ? "By Grade" : "By Class"}
                        </button>
                      ))}
                    </div>

                    {recipientType === "GRADE" && (
                      <select value={selectedGradeId} onChange={(e) => { setSelectedGradeId(e.target.value); setConfirmStep(false); setBroadcastResult(null); }}
                        className="w-full h-9 text-sm rounded-md border bg-background px-3">
                        <option value="">— Select Grade —</option>
                        {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    )}
                    {recipientType === "CLASS" && (
                      <select value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setConfirmStep(false); setBroadcastResult(null); }}
                        className="w-full h-9 text-sm rounded-md border bg-background px-3">
                        <option value="">— Select Class —</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{formatCompactClassLabel(c.gradeName, c.name)}</option>)}
                      </select>
                    )}

                    {/* Preview chip */}
                    {loadingPreview && (
                      <div className="text-xs text-muted-foreground animate-pulse">Counting recipients...</div>
                    )}
                    {preview && !loadingPreview && (
                      <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                        <div>
                          <span className="text-sm font-bold">{preview.withPhone}</span>
                          <span className="text-xs text-muted-foreground ml-1">parents will receive this message</span>
                          {preview.total - preview.withPhone > 0 && (
                            <span className="text-xs text-amber-600 ml-2">· {preview.total - preview.withPhone} have no phone number</span>
                          )}
                        </div>
                        {preview.sample.length > 0 && (
                          <div className="text-xs text-muted-foreground hidden sm:block">
                            e.g. {preview.sample.slice(0, 2).map((s) => s.name).join(", ")}
                            {preview.sample.length > 2 && "…"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Broadcast button + confirm step */}
                  {broadcastResult ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      <div className="text-sm">
                        <span className="font-semibold text-green-700">{broadcastResult.sent} sent</span>
                        {broadcastResult.failed > 0 && <span className="text-red-600 ml-2">{broadcastResult.failed} failed</span>}
                        {broadcastResult.noPhone > 0 && <span className="text-muted-foreground ml-2">{broadcastResult.noPhone} skipped (no phone)</span>}
                      </div>
                      <button className="ml-auto text-xs text-muted-foreground hover:text-foreground" onClick={() => setBroadcastResult(null)}>Dismiss</button>
                    </div>
                  ) : confirmStep ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-sm text-amber-800 dark:text-amber-300 flex-1">
                        Send to <strong>{preview?.withPhone ?? "?"} parents</strong> via {composeProvider === "SMS_GATEWAY" ? "SMS Gateway" : "Africa's Talking"}?
                      </span>
                      <Button onClick={handleBroadcast} disabled={broadcasting} size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700">
                        {broadcasting ? "Sending..." : "Confirm Send"}
                      </Button>
                      <button onClick={() => setConfirmStep(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleBroadcast}
                      disabled={broadcasting || !composeText.trim() || (preview !== null && preview.withPhone === 0)}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {preview ? `Broadcast to ${preview.withPhone} parents` : "Broadcast"}
                    </Button>
                  )}

                  {/* Quick test (collapsible) */}
                  <div className="pt-1">
                    <button onClick={() => setShowTestPanel((v) => !v)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <span>{showTestPanel ? "▾" : "▸"}</span> Quick Test Send (single number)
                    </button>
                    {showTestPanel && (
                      <div className="flex gap-2 mt-2">
                        <Input placeholder="+260971234567" value={testPhone} onChange={(e) => setTestPhone(e.target.value)}
                          className="font-mono text-sm h-8 flex-1" />
                        <Button onClick={handleTestSend} disabled={sendingTest} size="sm" variant="outline" className="h-8 text-xs shrink-0">
                          {sendingTest ? "Sending..." : "Test"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT — template library (2 cols) */}
            <div className="xl:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <BookTemplate className="h-4 w-4" />Template Library
                      </CardTitle>
                      <CardDescription className="text-xs">Reusable message templates</CardDescription>
                    </div>
                    <div className="flex gap-1.5">
                      {templates.length === 0 && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSeed} disabled={seeding}>
                          {seeding ? "Seeding..." : "Load Defaults"}
                        </Button>
                      )}
                      <Button size="sm" className="h-7 text-xs" onClick={() => setShowNewForm((v) => !v)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />New
                      </Button>
                    </div>
                  </div>

                  {/* Category filter */}
                  {categories.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {categories.map((c) => (
                        <button key={c} onClick={() => setFilterCategory(c)}
                          className={`px-2.5 py-0.5 rounded-full border text-xs font-medium transition-all
                            ${filterCategory === c ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"}`}>
                          {c === "all" ? "All" : c}
                        </button>
                      ))}
                    </div>
                  )}
                </CardHeader>

                {/* New template form */}
                {showNewForm && (
                  <CardContent className="pt-0 pb-3 border-b">
                    <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                      <p className="text-xs font-semibold">New Template</p>
                      <Input placeholder="Name (e.g. MEETING_NOTICE)" value={newForm.name}
                        onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value.toUpperCase().replace(/\s/g, "_") }))}
                        className="text-xs h-8 font-mono" />
                      <Input placeholder="Description (optional)" value={newForm.description}
                        onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
                        className="text-xs h-8" />
                      <select value={newForm.category} onChange={(e) => setNewForm((f) => ({ ...f, category: e.target.value }))}
                        className="w-full h-8 text-xs rounded-md border bg-background px-2">
                        {["general", "academic", "attendance", "finance"].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <Textarea placeholder="Message body. Use {variableName} for dynamic content." value={newForm.template}
                        onChange={(e) => setNewForm((f) => ({ ...f, template: e.target.value }))}
                        className="text-xs font-mono min-h-[80px] resize-none" />
                      <Input placeholder="Variables (comma-separated): parentName, studentName" value={newForm.variables}
                        onChange={(e) => setNewForm((f) => ({ ...f, variables: e.target.value }))}
                        className="text-xs h-8" />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs flex-1" onClick={handleCreate}>Save</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowNewForm(false); setNewForm(BLANK_TEMPLATE); }}>Cancel</Button>
                      </div>
                    </div>
                  </CardContent>
                )}

                <CardContent className="p-0">
                  {loadingTemplates ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">Loading...</div>
                  ) : visibleTemplates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground px-4">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">No templates yet. Click &quot;Load Defaults&quot; or create one.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {visibleTemplates.map((t) => (
                        <div key={t.id}>
                          {editingId === t.id ? (
                            /* inline edit */
                            <div className="p-3 space-y-2 bg-muted/20">
                              <Input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" className="text-xs h-8" />
                              <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                                className="w-full h-8 text-xs rounded-md border bg-background px-2">
                                {["general", "academic", "attendance", "finance"].map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <Textarea value={editForm.template} onChange={(e) => setEditForm((f) => ({ ...f, template: e.target.value }))}
                                className="text-xs font-mono min-h-[80px] resize-none" />
                              <Input value={editForm.variables} onChange={(e) => setEditForm((f) => ({ ...f, variables: e.target.value }))} placeholder="Variables (comma-separated)" className="text-xs h-8" />
                              <div className="flex gap-2">
                                <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSaveEdit}>Save</Button>
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className={`px-4 py-3 hover:bg-muted/20 transition-colors ${!t.isActive ? "opacity-50" : ""}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold font-mono">{t.name.replace(/_/g, " ")}</span>
                                    <CategoryBadge cat={t.category} />
                                  </div>
                                  {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono leading-relaxed">{t.template}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => handlePickTemplate(t)} title="Use template"
                                    className="p-1 rounded hover:bg-primary/10 text-primary transition-colors">
                                    <Send className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => { setEditingId(t.id); setEditForm({ name: t.name, description: t.description ?? "", category: t.category, template: t.template, variables: t.variables.join(", ") }); }}
                                    title="Edit" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => handleToggle(t)} title={t.isActive ? "Deactivate" : "Activate"}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    {t.isActive ? <ToggleRight className="h-3.5 w-3.5 text-green-500" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                                  </button>
                                  <button onClick={() => handleDelete(t.id)} title="Delete"
                                    className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
