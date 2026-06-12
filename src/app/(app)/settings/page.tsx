export const dynamic = "force-dynamic";

import { eq } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { AkahuTokensForm } from "@/components/settings/AkahuTokensForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await requireUser();

  const [settings] = await db
    .select({
      akahuAppToken: userSettings.akahuAppToken,
      akahuUserToken: userSettings.akahuUserToken,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));

  const akahuConfigured = Boolean(
    settings?.akahuAppToken && settings?.akahuUserToken
  );

  return (
    <>
      <TopBar title="Settings" />
      <main className="flex-1 overflow-auto p-3 sm:p-6 space-y-6">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Name:</span> {user.name}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span> {user.email}
            </p>
          </CardContent>
        </Card>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Akahu connection</CardTitle>
            <CardDescription>
              Personal app tokens from{" "}
              <a
                href="https://my.akahu.nz"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                my.akahu.nz
              </a>
              . Tokens are encrypted at rest and never shown again after saving.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AkahuTokensForm configured={akahuConfigured} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
