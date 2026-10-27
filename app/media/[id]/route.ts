// filename: app/media/[id]/route.ts
import { actor } from "@/lib/auth/identity";
import { services } from "@/lib/server";
import { images } from "@/modules/catalog/service";
import { ensure } from "@/lib/errors";
import { problem } from "@/lib/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { store } = services(),
      { id } = await params,
      m = await store.get("Media", id);
    ensure(m, 404, "Image not found.");
    const p = await store.get("Product", m.productId),
      category = p ? await store.get("Category", p.categoryId) : null;
    ensure(
      (p?.active &&
        category?.active &&
        images(p.images).includes(`/media/${id}`)) ||
        (await actor())?.admin,
      404,
      "Image not found.",
    );
    return new Response(new Uint8Array(await store.document(m.documentId)), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return problem(e);
  }
}
