// filename: app/(shop)/cart/page.tsx
import { CartPage } from "@/components/cart";
export const metadata = {
  title: "Your bag",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <div className="container narrow">
      <span className="eyebrow">GOOD THINGS, TOGETHER</span>
      <h1>Your bag.</h1>
      <CartPage />
    </div>
  );
}
