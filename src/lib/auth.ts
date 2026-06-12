import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import {
  users,
  sessions,
  authAccounts,
  verifications,
} from "@/lib/db/auth-schema";
import { claimOrphanedData } from "@/lib/db/claim";

// Origins allowed to hit the auth endpoints. BETTER_AUTH_URL covers the
// canonical address; the rest cover local dev fallback ports and the Docker
// container port mapping (4242). Extend via the comma-separated
// TRUSTED_ORIGINS env var when serving from another host (e.g. a LAN IP).
const trustedOrigins = [
  "http://localhost:3000",
  "http://localhost:3002",
  "http://localhost:4242",
  ...(process.env.TRUSTED_ORIGINS?.split(",").map((o) => o.trim()) ?? []),
];

export const auth = betterAuth({
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    // Explicit mapping: Better Auth's "account" model must not resolve to the
    // Akahu "accounts" table.
    schema: {
      user: users,
      session: sessions,
      account: authAccounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await claimOrphanedData(user.id);
        },
      },
    },
  },
});
