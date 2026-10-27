// filename: app/admin/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { actor } from "@/lib/auth/identity";
import { SignOut } from "@/admin/sign-out";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Store desk",
  robots: { index: false, follow: false },
};
export default async function Layout({ children }: { children: ReactNode }) {
  const user = await actor();
  if (!user) redirect("/sign-in");
  if (!user.admin) redirect("/account");
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/admin" className="brand">
          f. <span>Store desk</span>
        </a>
        <p className="eyebrow">FIELDWORK SUPPLY</p>
        <nav aria-label="Administration">
          {[
            ["", "Overview"],
            ["products", "Products"],
            ["categories", "Categories"],
            ["inventory", "Inventory"],
            ["orders", "Orders"],
            ["settings", "Store settings"],
            ["outbox", "Email outbox"],
          ].map(([path, label]) => (
            <a key={path} href={`/admin/${path}`}>
              {label}
              <span>↗</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="/">View storefront ↗</a>
          <p>{user.email}</p>
          <SignOut />
        </div>
      </aside>
      <main id="main" className="admin-main">
        {children}
      </main>
    </div>
  );
}
