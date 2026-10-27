// filename: lib/auth/admin-access.ts
import "server-only";
import { redirect } from "next/navigation";
import { actor } from "./identity";
import { services } from "../server";
export async function adminServices() {
  const user = await actor();
  if (!user) redirect("/sign-in");
  if (!user.admin) redirect("/account");
  return services();
}
