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
// TRUSTED_ORIGINS env var for host-specific setups (e.g. add to docker-compose.yml
// or .env.local: TRUSTED_ORIGINS=http://hal:4242,http://other-host:4242).
const trustedOrigins = [
  "http://localhost:3000",
  "http://localhost:3002",
  "http://localhost:4242",
  ...(process.env.BETTER_AUTH_URL
    ? [new URL(process.env.BETTER_AUTH_URL).origin]
    : []),
  ...(process.env.TRUSTED_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean) ?? []),
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
