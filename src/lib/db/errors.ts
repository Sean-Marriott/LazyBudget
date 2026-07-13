/**
 * True when the error is a Postgres unique-constraint violation (code 23505).
 * Drizzle wraps the pg driver error in a DrizzleQueryError, so the code may
 * live on the error itself or on its `cause`.
 */
export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ("code" in err && (err as { code: unknown }).code === "23505") return true;
  if ("cause" in err) return isUniqueViolation((err as { cause: unknown }).cause);
  return false;
}
