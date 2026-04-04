"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, toNumber } from "@/lib/utils/currency";
import { ManualAssetDialog } from "@/components/accounts/ManualAssetDialog";
import type { ManualAsset } from "@/lib/queries/manual-assets";

interface ManualAssetCardProps {
  asset: ManualAsset;
}

export function ManualAssetCard({ asset }: ManualAssetCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${asset.name}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/manual-assets/${asset.id}`, { method: "DELETE" });
      if (!res.ok) {
        window.alert("Failed to delete asset. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      window.alert("Failed to delete asset. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                {asset.emoji ? (
                  <span className="text-xl leading-none">{asset.emoji}</span>
                ) : (
                  <Package className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{asset.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {asset.notes ?? "Other asset"}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-lg tabular-nums text-[#9ece6a]">
                {formatCurrency(toNumber(asset.value))}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <Badge variant="secondary" className="text-xs text-muted-foreground">
              Other Asset
            </Badge>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditOpen(true)}
                aria-label="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Delete"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ManualAssetDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        asset={asset}
      />
    </>
  );
}
