// filename: app/api/ready/route.ts
import { services } from "@/lib/server";
import { settings } from "@/modules/catalog/service";
import { problem } from "@/lib/http";
export async function GET() {
  try {
    await settings(services().store);
    return Response.json({ status: "ready" });
  } catch (e) {
    return problem(e);
  }
}
