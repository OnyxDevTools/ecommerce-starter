// filename: app/(shop)/checkout/page.tsx
import { Checkout } from "@/components/checkout";
import { settings } from "@/modules/catalog/service";
import { services } from "@/lib/server";
export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const s = await settings(services().store),
    mode = process.env.CHECKOUT_MODE;
  return (
    <div className="container">
      <h1>The last little step.</h1>
      <Checkout
        mode={mode === "demo" || mode === "stripe" ? mode : "disabled"}
        country={s.country}
      />
    </div>
  );
}
