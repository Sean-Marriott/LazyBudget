"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function AkahuTokensForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [appToken, setAppToken] = useState("");
  const [userToken, setUserToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/settings/akahu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appToken, userToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save tokens");
        return;
      }
      setAppToken("");
      setUserToken("");
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Status:</span>
        {configured ? (
          <Badge variant="outline" className="text-[#9ece6a] border-[#9ece6a]/40">
            Configured ✓
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Not set
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="appToken">App token</Label>
        <Input
          id="appToken"
          type="password"
          placeholder="app_token_…"
          required
          autoComplete="off"
          value={appToken}
          onChange={(e) => setAppToken(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="userToken">User token</Label>
        <Input
          id="userToken"
          type="password"
          placeholder="user_token_…"
          required
          autoComplete="off"
          value={userToken}
          onChange={(e) => setUserToken(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !error && (
        <p className="text-sm text-[#9ece6a]">Tokens saved — you can sync now.</p>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : configured ? "Replace tokens" : "Save tokens"}
      </Button>
    </form>
  );
}
