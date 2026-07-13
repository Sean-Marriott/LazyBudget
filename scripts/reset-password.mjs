#!/usr/bin/env node
/**
 * One-off password reset for a Better Auth email/password account.
 * Overwrites the stored scrypt hash using Better Auth's own hasher —
 * the same one signup uses — so login verifies it identically.
 *
 * Usage:
 *   DATABASE_URL=postgresql://lazybudget:lazybudget@localhost:5433/lazybudget \
 *     node scripts/reset-password.mjs you@example.com
 *
 * The new password is prompted interactively (not echoed, not in shell history).
 */
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import pg from "pg";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/reset-password.mjs <email>");
  process.exit(1);
}
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://lazybudget:lazybudget@localhost:5433/lazybudget";

// Hide typed input on a real terminal; piped stdin (non-TTY) supplies the
// password and confirmation as two lines.
async function readPasswords() {
  if (process.stdin.isTTY !== true) {
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    const [password = "", confirm = ""] = data.split("\n");
    return { password, confirm };
  }

  const muted = new Writable({
    write(_chunk, _enc, cb) {
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output: muted, terminal: true });
  const ask = (question) => {
    process.stdout.write(question);
    return new Promise((resolve) => {
      rl.question("", (answer) => {
        process.stdout.write("\n");
        resolve(answer);
      });
    });
  };
  const password = await ask("New password (min 8 chars, hidden): ");
  const confirm = await ask("Confirm password: ");
  rl.close();
  return { password, confirm };
}

const { password, confirm } = await readPasswords();
if (!password || password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}
if (password !== confirm) {
  console.error("Passwords do not match.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  const { rows } = await client.query(
    `SELECT a.id
       FROM auth_accounts a
       JOIN users u ON u.id = a.user_id
      WHERE u.email = $1 AND a.provider_id = 'credential'`,
    [email]
  );
  if (rows.length === 0) {
    console.error(`No credential account found for ${email}.`);
    process.exit(1);
  }

  const hash = await hashPassword(password);
  await client.query(
    `UPDATE auth_accounts SET password = $1, updated_at = now() WHERE id = $2`,
    [hash, rows[0].id]
  );

  // Read back and verify so a silent mismatch can't lock the account
  const { rows: check } = await client.query(
    `SELECT password FROM auth_accounts WHERE id = $1`,
    [rows[0].id]
  );
  const ok = await verifyPassword({ hash: check[0].password, password });
  if (!ok) {
    console.error("Verification of the new hash failed — password NOT usable, investigate before logging out.");
    process.exit(1);
  }
  console.log(`Password updated for ${email}. Existing sessions remain valid.`);
} finally {
  await client.end();
}
