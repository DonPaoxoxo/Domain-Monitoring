import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, createSessionToken, verifySessionToken } from "@/lib/session";
import { getAppSettings } from "@/lib/settings";

/**
 * Validates the `Authorization: Bearer <key>` header used by checker nodes to
 * call the main server's checker API. The expected key is the one configured
 * in System Settings (falling back to the CHECKER_API_KEY env var if it has
 * never been regenerated there).
 *
 * Returns a 401 NextResponse if the request is unauthorized, or `null`
 * if the request is authorized and should proceed.
 */
export async function checkApiKey(request: Request): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  const { checkerApiKey } = await getAppSettings();

  if (scheme !== "Bearer" || !token || !checkerApiKey || token !== checkerApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

/** Signs the admin in by setting a session cookie. */
export async function createSession(username: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(username), {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Signs the admin out by clearing the session cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** Returns the current admin session, or `null` if not signed in. */
export async function getSession(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  return session ? { username: session.username } : null;
}
