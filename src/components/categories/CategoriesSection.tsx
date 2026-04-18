"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryCard } from "./CategoryCard";
import { CategoryDialog } from "./CategoryDialog";
import type { Category } from "@/lib/queries/categories";

interface CategoriesSectionProps {
  categories: Category[];
  transactionCounts: Record<number, number>;
}

export function CategoriesSection({ categories, transactionCounts }: CategoriesSectionProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Custom Categories
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add your own categories to use alongside the built-in ones.
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add category
          </Button>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center space-y-1">
            <p className="text-sm font-medium">No custom categories yet</p>
            <p className="text-xs text-muted-foreground">
              Add a category to use it when editing transactions or rules.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                transactionCount={transactionCounts[cat.id] ?? 0}
              />
            ))}
          </div>
        )}
      </div>

      <CategoryDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
