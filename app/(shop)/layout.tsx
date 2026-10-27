// filename: app/(shop)/layout.tsx
import type { ReactNode } from "react";
import { Header, Footer } from "@/components/shell";
import { services } from "@/lib/server";
import { settings } from "@/modules/catalog/service";
import { CartProvider } from "@/components/cart";
export const dynamic = "force-dynamic";
export default async function Layout({ children }: { children: ReactNode }) {
  const config = await settings(services().store);
  return (
    <CartProvider>
      <Header
        name={config.name}
        freeShipping={config.freeShipping}
        currency={config.currency}
      />
      <main id="main">{children}</main>
      <Footer name={config.name} />
    </CartProvider>
  );
}
