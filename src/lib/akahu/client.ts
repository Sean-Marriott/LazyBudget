import { AkahuClient } from "akahu";

// Lazily instantiate so the module can be imported at build time
// without needing valid tokens (which only exist at runtime).
let _client: AkahuClient | null = null;

export function getAkahuClient(): AkahuClient {
  if (!_client) {
    const appToken = process.env.AKAHU_APP_TOKEN;
    if (!appToken) throw new Error("AKAHU_APP_TOKEN is not set in .env.local");
    _client = new AkahuClient({ appToken });
  }
  return _client;
}

export function getUserToken(): string {
  const token = process.env.AKAHU_USER_TOKEN;
  if (!token) throw new Error("AKAHU_USER_TOKEN is not set in .env.local");
  return token;
}
