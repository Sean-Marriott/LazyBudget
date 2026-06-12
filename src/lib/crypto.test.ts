import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt } from "./crypto";

const TEST_KEY = "a".repeat(64); // 32 bytes of hex

describe("crypto", () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = originalKey;
  });

  it("round-trips a plaintext value", () => {
    const secret = "user_token_abc123";
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    expect(encrypt("same")).not.toBe(encrypt("same"));
  });

  it("emits the iv.tag.ciphertext format", () => {
    expect(encrypt("x").split(".")).toHaveLength(3);
  });

  it("throws on a tampered payload (GCM auth)", () => {
    const payload = encrypt("secret");
    const [iv, tag, ct] = payload.split(".");
    const flipped = Buffer.from(ct, "base64");
    flipped[0] ^= 0xff;
    const tampered = `${iv}.${tag}.${flipped.toString("base64")}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws on a malformed payload", () => {
    expect(() => decrypt("not-a-valid-payload")).toThrow(
      "Invalid encrypted payload format"
    );
  });

  it("throws when ENCRYPTION_KEY is missing", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("x")).toThrow("ENCRYPTION_KEY is not set");
  });

  it("throws when ENCRYPTION_KEY is the wrong length", () => {
    process.env.ENCRYPTION_KEY = "abcd";
    expect(() => encrypt("x")).toThrow("32 bytes");
  });
});
