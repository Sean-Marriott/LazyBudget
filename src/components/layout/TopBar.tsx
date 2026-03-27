import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SyncButton } from "./SyncButton";

export async function TopBar({ title }: { title: string }) {
  let lastSyncAt: string | null = null;
  try {
    const setting = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "last_sync_at"))
      .limit(1);
    lastSyncAt = setting[0]?.value ?? null;
  } catch {
    // DB not yet migrated or unavailable
  }

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <SyncButton lastSyncAt={lastSyncAt} />
    </header>
  );
}
