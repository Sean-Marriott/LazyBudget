import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM encryption for secrets at rest (Akahu tokens in user_settings).
// Payload format: "<iv b64>.<auth tag b64>.<ciphertext b64>"

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error("ENCRYPTION_KEY is not set in .env.local");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes of hex (64 hex chars)");
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

export function decrypt(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted payload format");
  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
