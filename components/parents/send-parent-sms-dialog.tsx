"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Phone,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type Provider = "SMS_GATEWAY" | "AFRICAS_TALKING";

interface SendParentSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "bulk" | "targeted";
  parent?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  };
}

const VARIABLES = ["{parentName}", "{studentName}", "{schoolName}", "{date}"];
const MAX_SMS_CHARS = 480; // 3 SMS segments

export function SendParentSmsDialog({
  open,
  onOpenChange,
  mode,
  parent,
}: SendParentSmsDialogProps) {
  const tok = () =>
    typeof window !== "undefined" ? localStorage.getItem("auth_token") ?? "" : "";

  const [message, setMessage] = useState("");
  const [activeProvider, setActiveProvider] = useState<Provider>("SMS_GATEWAY");
  const [previewCount, setPreviewCount] = useState<{ total: number; withPhone: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    noPhone: number;
  } | null>(null);

  // Load SMS provider setting on open
  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/settings/sms", { headers: { Authorization: `Bearer ${tok()}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.activeProvider) setActiveProvider(d.data.activeProvider);
      })
      .catch(() => null);
  }, [open]);

  // Load recipient count for bulk mode
  useEffect(() => {
    if (!open || mode !== "bulk") return;
    setLoadingPreview(true);
    fetch("/api/sms/broadcast/preview?type=ALL", {
      headers: { Authorization: `Bearer ${tok()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setPreviewCount({ total: d.data.total, withPhone: d.data.withPhone });
      })
      .catch(() => null)
      .finally(() => setLoadingPreview(false));
  }, [open, mode]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMessage("");
      setConfirmStep(false);
      setResult(null);
      setPreviewCount(null);
    }
  }, [open]);

  const recipientCount =
    mode === "targeted" ? (parent?.phone ? 1 : 0) : (previewCount?.withPhone ?? 0);

  const canSend = message.trim().length > 0 && recipientCount > 0 && !sending;

  const handleSend = async () => {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const body =
        mode === "targeted"
          ? {
              recipientType: "INDIVIDUAL",
              guardianIds: [parent!.id],
              message: message.trim(),
              provider: activeProvider,
            }
          : {
              recipientType: "ALL",
              message: message.trim(),
              provider: activeProvider,
            };

      const res = await fetch("/api/sms/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        setResult(d.data);
        setConfirmStep(false);
        if (d.data.sent > 0) toast.success(`Sent ${d.data.sent} message${d.data.sent !== 1 ? "s" : ""}`);
        else toast.info("No messages were sent.");
      } else {
        toast.error(d.error || "Failed to send messages.");
        setConfirmStep(false);
      }
    } finally {
      setSending(false);
    }
  };

  const charsLeft = MAX_SMS_CHARS - message.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {mode === "targeted"
              ? `Send SMS to ${parent?.firstName} ${parent?.lastName}`
              : "Bulk SMS to All Parents"}
          </DialogTitle>
          <DialogDescription>
            {mode === "targeted"
              ? "Send a direct message to this parent's phone."
              : "Send a message to all parents with a registered phone number."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Recipient summary */}
          <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-3">
            {mode === "targeted" ? (
              <>
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">
                    {parent?.firstName} {parent?.lastName}
                  </span>
                  {parent?.phone ? (
                    <span className="text-muted-foreground ml-2">{parent.phone}</span>
                  ) : (
                    <span className="text-destructive ml-2 text-xs">No phone number</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="text-sm">
                  {loadingPreview ? (
                    <span className="text-muted-foreground animate-pulse">
                      Loading recipients...
                    </span>
                  ) : previewCount ? (
                    <>
                      <span className="font-medium">{previewCount.withPhone} parents</span>
                      <span className="text-muted-foreground ml-1">will receive this message</span>
                      {previewCount.total - previewCount.withPhone > 0 && (
                        <span className="text-amber-600 text-xs ml-2">
                          ({previewCount.total - previewCount.withPhone} have no phone)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">No recipients found</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Variable chips */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Insert variables (click to add):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <button
                  key={v}
                  onClick={() => setMessage((m) => m + v)}
                  className="text-xs font-mono px-2 py-0.5 rounded border bg-muted hover:bg-muted/70 transition-colors">
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Message input */}
          <div className="space-y-1.5">
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX_SMS_CHARS}
              rows={4}
              className="resize-none text-sm"
            />
            <p className={`text-xs text-right ${charsLeft < 40 ? "text-amber-600" : "text-muted-foreground"}`}>
              {charsLeft} characters remaining
            </p>
          </div>

          {/* Result */}
          {result && (
            <div
              className={`rounded-lg border p-3 flex items-start gap-3 ${
                result.sent > 0
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                  : "bg-muted/30"
              }`}>
              {result.sent > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div className="text-sm space-y-0.5">
                {result.sent > 0 && (
                  <p className="font-medium text-green-700">
                    {result.sent} message{result.sent !== 1 ? "s" : ""} sent
                  </p>
                )}
                {result.failed > 0 && (
                  <p className="text-red-600">{result.failed} failed</p>
                )}
                {result.noPhone > 0 && (
                  <p className="text-muted-foreground">{result.noPhone} skipped (no phone)</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Sending via</span>
            <Badge variant="outline" className="text-xs">
              {activeProvider === "SMS_GATEWAY" ? "SMS Gateway" : "Africa's Talking"}
            </Badge>
          </div>

          <Separator />

          {/* Actions */}
          {confirmStep && !result ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-sm text-amber-800 dark:text-amber-300 flex-1">
                Send to <strong>{recipientCount} parent{recipientCount !== 1 ? "s" : ""}</strong>?
              </span>
              <Button
                onClick={handleSend}
                disabled={sending}
                size="sm"
                className="h-7 text-xs bg-amber-600 hover:bg-amber-700">
                {sending ? "Sending..." : "Confirm"}
              </Button>
              <button
                onClick={() => setConfirmStep(false)}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0">
                Cancel
              </button>
            </div>
          ) : !result ? (
            <Button onClick={handleSend} disabled={!canSend} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Send to {recipientCount} parent{recipientCount !== 1 ? "s" : ""}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setConfirmStep(false);
                setMessage("");
              }}
              className="w-full">
              Send Another
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
