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
import type { ManualAsset } from "@/lib/queries/manual-assets";

interface ManualAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: ManualAsset;
  latestSnapshotDate?: string;
}

export function ManualAssetDialog({
  open,
  onOpenChange,
  asset,
  latestSnapshotDate,
}: ManualAssetDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [emoji, setEmoji] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(asset?.name ?? "");
      setValue(asset?.value ?? "");
      setNotes(asset?.notes ?? "");
      setEmoji(asset?.emoji ?? "");
      setError(null);
    }
  }, [open, asset]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const url = asset
        ? `/api/manual-assets/${asset.id}`
        : "/api/manual-assets";
      const method = asset ? "PATCH" : "POST";

      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, value, notes, emoji }),
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
          <DialogTitle>{asset ? "Edit asset" : "Add asset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="space-y-1.5 w-20 shrink-0">
              <Label htmlFor="asset-emoji">Emoji</Label>
              <Input
                id="asset-emoji"
                placeholder="🚗"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="text-center text-lg"

              />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <Label htmlFor="asset-name">Name</Label>
              <Input
                id="asset-name"
                placeholder="e.g. Car, Laptop, Boat"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="asset-value">Value (NZD)</Label>
              {asset && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-64">
                      <p>
                        Corrects the current value.
                        {latestSnapshotDate
                          ? ` The snapshot recorded on ${latestSnapshotDate} will also be updated to match.`
                          : " If you have recorded value history, the most recent snapshot will also be updated to match."}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Input
              id="asset-value"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="asset-notes">Notes (optional)</Label>
            <Input
              id="asset-notes"
              placeholder="e.g. 2021 Toyota Hilux"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : asset ? "Save changes" : "Add asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
