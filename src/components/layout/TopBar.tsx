import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/session";
import { SyncButton } from "@/components/layout/SyncButton";
import { MenuToggleButton } from "@/components/layout/MenuToggleButton";

export async function TopBar({ title }: { title: string }) {
  let lastSyncAt: string | null = null;
  try {
    const user = await requireUser();
    const [settings] = await db
      .select({ lastSyncAt: userSettings.lastSyncAt })
      .from(userSettings)
      .where(eq(userSettings.userId, user.id))
      .limit(1);
    lastSyncAt = settings?.lastSyncAt?.toISOString() ?? null;
  } catch {
    // DB not yet migrated or unavailable
  }

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center">
        <MenuToggleButton />
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      <SyncButton lastSyncAt={lastSyncAt} />
    </header>
  );
}
