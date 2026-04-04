"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManualAssetCard } from "@/components/accounts/ManualAssetCard";
import { ManualAssetDialog } from "@/components/accounts/ManualAssetDialog";
import type { ManualAsset } from "@/lib/queries/manual-assets";

interface OtherAssetsSectionProps {
  assets: ManualAsset[];
}

export function OtherAssetsSection({ assets }: OtherAssetsSectionProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Other Assets
        </h2>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add asset
        </Button>
      </div>
      {assets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((a) => (
            <ManualAssetCard key={a.id} asset={a} />
          ))}
        </div>
      )}
      <ManualAssetDialog open={addOpen} onOpenChange={setAddOpen} />
    </section>
  );
}
