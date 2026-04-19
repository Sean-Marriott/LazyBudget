"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryDialog } from "@/components/categories/CategoryDialog";
import type { Category } from "@/lib/queries/categories";

interface CategoryCardProps {
  category: Category;
  transactionCount: number;
}

export function CategoryCard({ category, transactionCount }: CategoryCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const msg =
      transactionCount > 0
        ? `Delete "${category.name}"? This will remove the category from ${transactionCount} transaction${transactionCount !== 1 ? "s" : ""}.`
        : `Delete "${category.name}"?`;
    if (!window.confirm(msg)) return;

    setDeleting(true);
    try {
      let res: Response;
      try {
        res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      } catch {
        window.alert("Failed to delete category. Please try again.");
        return;
      }
      if (res.ok) {
        router.refresh();
      } else {
        window.alert("Failed to delete category. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="rounded-lg border p-4 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
          style={{ backgroundColor: category.color + "30", color: category.color }}
        >
          {category.emoji ?? ""}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{category.name}</p>
          {transactionCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {transactionCount} transaction{transactionCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="w-4 h-4 rounded-full border border-border"
            style={{ backgroundColor: category.color }}
          />
          <span className="text-xs text-muted-foreground font-mono">{category.color}</span>
        </div>

        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Edit category"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            aria-label="Delete category"
            disabled={deleting}
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <CategoryDialog open={editOpen} onOpenChange={setEditOpen} category={category} />
    </>
  );
}
