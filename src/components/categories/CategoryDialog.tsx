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
import type { Category } from "@/lib/queries/categories";

const PRESET_COLORS = [
  "#e0af68", "#9ece6a", "#7aa2f7", "#bb9af7",
  "#ff9e64", "#f7768e", "#73daca", "#a9b1d6",
  "#fc7b7b", "#38bdae", "#e0e0e0", "#565f89",
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
}

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [emoji, setEmoji] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setColor(category?.color ?? PRESET_COLORS[0]);
      setEmoji(category?.emoji ?? "");
      setError(null);
    }
  }, [open, category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!HEX_RE.test(color)) {
      setError("Color must be a valid hex code (e.g. #e0af68)");
      return;
    }

    setSaving(true);
    try {
      const url = category ? `/api/categories/${category.id}` : "/api/categories";
      const method = category ? "PATCH" : "POST";

      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color, emoji: emoji || null }),
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

  const colorValid = HEX_RE.test(color);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "Add category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="space-y-1.5 w-20 shrink-0">
              <Label htmlFor="cat-emoji">Emoji</Label>
              <Input
                id="cat-emoji"
                placeholder="🛒"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="text-center text-lg"
              />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                placeholder="e.g. Subscriptions"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-7 h-7 rounded-full border border-border shrink-0"
                style={{ backgroundColor: colorValid ? color : "#888" }}
              />
              <Input
                placeholder="#e0af68"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="font-mono w-32"
                maxLength={7}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : category ? "Save changes" : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
