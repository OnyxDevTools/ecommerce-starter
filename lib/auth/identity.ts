// filename: lib/auth/identity.ts
import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { firebaseAdmin } from "./admin";
import { sessionCookie } from "./session";
import type { Actor } from "../domain";
import { services } from "../server";
export async function actor(): Promise<Actor | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  let user;
  try {
    const auth = firebaseAdmin(),
      claims = await auth.verifySessionCookie(token, true);
    user = await auth.getUser(claims.uid);
  } catch {
    return null;
  }
  if (user.disabled || !user.emailVerified || !user.email) return null;
  const grant = await services().store.get("Customer", user.uid);
  return {
    id: user.uid,
    email: user.email,
    name: user.displayName || user.email,
    admin:
      grant?.active === true &&
      grant.role === "administrator" &&
      grant.email === user.email,
  };
}
export async function cartIdentity(create = false) {
  const jar = await cookies();
  let secret = jar.get("store_bag")?.value;
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) {
    if (!create) return "";
    secret = randomBytes(32).toString("hex");
    jar.set("store_bag", secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.APP_ORIGIN?.startsWith("https:") || false,
      path: "/",
      maxAge: 30 * 86400,
    });
  }
  return createHash("sha256").update(secret).digest("hex");
}
