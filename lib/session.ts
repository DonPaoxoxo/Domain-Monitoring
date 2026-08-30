import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "mihawk_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

interface SessionPayload {
  username: string;
  expiresAt: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

/** Creates a signed session token for the given username. */
export function createSessionToken(username: string): string {
  const payload: SessionPayload = {
    username,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

/** Verifies a session token's signature and expiry, returning its payload if valid. */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;

  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expectedSignature = sign(data);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
