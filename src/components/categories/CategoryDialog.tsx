"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HexColorPicker } from "react-colorful";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category } from "@/lib/queries/categories";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
}

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#e0af68");
  const [emoji, setEmoji] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setColor(category?.color ?? "#e0af68");
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
                maxLength={8}
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
            <Label htmlFor="cat-color-hex">Color</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger
                  className="w-8 h-8 rounded-full border border-border shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  style={{ backgroundColor: colorValid ? color : "#888" }}
                  aria-label="Open color picker"
                />
                <PopoverContent className="w-auto p-3 space-y-2">
                  <HexColorPicker color={colorValid ? color : "#888888"} onChange={setColor} />
                  <Input
                    id="cat-color-hex"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="font-mono h-8 text-sm"
                    maxLength={7}
                    aria-invalid={!colorValid}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-sm font-mono text-muted-foreground">{color}</span>
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
