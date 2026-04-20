"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";

interface UpdateValueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: number;
  entityName: string;
  entityType: "account" | "asset";
  currentValue: number;
}

export function UpdateValueDialog({
  open,
  onOpenChange,
  entityId,
  entityName,
  entityType,
  currentValue,
}: UpdateValueDialogProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(currentValue.toFixed(2));
      setDate(format(new Date(), "yyyy-MM-dd"));
      setError(null);
    }
  }, [open, currentValue]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const numValue = Number(value);
    if (!Number.isFinite(numValue)) {
      setError("Please enter a valid number.");
      setSaving(false);
      return;
    }

    const endpoint =
      entityType === "account"
        ? `/api/manual-accounts/${entityId}/snapshots`
        : `/api/manual-assets/${entityId}/snapshots`;

    const bodyKey = entityType === "account" ? "balance" : "value";

    try {
      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [bodyKey]: numValue, date }),
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

  const label = entityType === "account" ? "Balance (NZD)" : "Value (NZD)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update {entityName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="update-value">{label}</Label>
            <Input
              id="update-value"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="update-date">Date</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    <p>
                      Records a snapshot for this date. If this is the most recent
                      entry, the current balance will also be updated. Backdated
                      entries are saved for history but won&apos;t overwrite the
                      current value.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="update-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Record update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
