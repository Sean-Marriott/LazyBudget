"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/utils/dates";

interface SyncButtonProps {
  lastSyncAt?: string | null;
}

export function SyncButton({ lastSyncAt }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(lastSyncAt ?? null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(`Next sync available at ${new Date(data.nextAllowedAt).toLocaleTimeString()}`);
        } else {
          setError(data.error ?? "Sync failed");
        }
      } else {
        setLastSync(new Date().toISOString());
        // Reload the page to show fresh data
        window.location.reload();
      }
    } catch {
      setError("Network error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
      {lastSync && !error && (
        <span className="text-xs text-muted-foreground">
          Synced {formatTimeAgo(lastSync)}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={syncing}
        className="gap-2"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing…" : "Sync"}
      </Button>
    </div>
  );
}
