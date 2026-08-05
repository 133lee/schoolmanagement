"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface PasswordChangePromptProps {
  hasDefaultPassword?: boolean;
}

export function PasswordChangePrompt({ hasDefaultPassword }: PasswordChangePromptProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has default password and hasn't dismissed this session
    if (hasDefaultPassword && !dismissed) {
      setOpen(true);
    }
  }, [hasDefaultPassword, dismissed]);

  const handleDismiss = () => {
    setOpen(false);
    setDismissed(true); // Only dismiss for this session
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle>Change Your Password</DialogTitle>
          </div>
          <DialogDescription className="pt-3">
            You are currently using the default password <span className="font-mono font-semibold">teacher123</span>.
            <br />
            <br />
            For your security, please change your password to something personal and secure.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleDismiss}>
            Remind Me Later
          </Button>
          <Button onClick={handleDismiss}>
            Okay, I'll Change It
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
