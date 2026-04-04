"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAccountTypeLabel } from "@/lib/utils/accounts";
import type { ManualAccountWithGroup } from "@/lib/queries/manual-accounts";

const ACCOUNT_TYPES = [
  "CHECKING",
  "SAVINGS",
  "CREDITCARD",
  "LOAN",
  "KIWISAVER",
  "INVESTMENT",
  "TERMDEPOSIT",
  "FOREIGN",
  "WALLET",
] as const;

interface ManualAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: ManualAccountWithGroup;
}

export function ManualAccountDialog({
  open,
  onOpenChange,
  account,
}: ManualAccountDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("CHECKING");
  const [balance, setBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(account?.name ?? "");
      setType(account?.type ?? "CHECKING");
      setBalance(account?.balance ?? "");
      setNotes(account?.notes ?? "");
      setError(null);
    }
  }, [open, account]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const url = account
        ? `/api/manual-accounts/${account.id}`
        : "/api/manual-accounts";
      const method = account ? "PATCH" : "POST";

      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, type, balance, notes }),
        });
      } catch {
        setError("Network error. Please check your connection and try again.");
        return;
      }

      if (!res.ok) {
        let message = "Something went wrong";
        try {
          const data = await res.json();
          message = data.error ?? message;
        } catch {}
        setError(message);
        return;
      }

      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "Add account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              placeholder="e.g. Westpac Savings, Cash"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-type">Type</Label>
            <select
              id="account-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {getAccountTypeLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-balance">Balance (NZD)</Label>
            <Input
              id="account-balance"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-notes">Notes (optional)</Label>
            <Input
              id="account-notes"
              placeholder="e.g. Holiday fund"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : account ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
