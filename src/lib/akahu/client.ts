import { AkahuClient } from "akahu";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { userSettings } from "../db/schema";
import { decrypt } from "../crypto";

export class AkahuNotConfiguredError extends Error {
  constructor() {
    super("Akahu tokens are not configured — add them in Settings");
    this.name = "AkahuNotConfiguredError";
  }
}

/**
 * Loads the user's encrypted Akahu tokens from user_settings and returns a
 * ready-to-use client. Throws AkahuNotConfiguredError if the user hasn't
 * saved tokens yet.
 */
export async function getAkahuForUser(
  userId: string
): Promise<{ client: AkahuClient; userToken: string }> {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  if (!settings?.akahuAppToken || !settings?.akahuUserToken) {
    throw new AkahuNotConfiguredError();
  }

  return {
    client: new AkahuClient({ appToken: decrypt(settings.akahuAppToken) }),
    userToken: decrypt(settings.akahuUserToken),
  };
}
