// filename: components/shell.tsx
import { formatMoney } from "@/lib/money";
import { CartButton, CartDrawer } from "./cart";
export function Header({
  name,
  freeShipping,
  currency,
}: {
  name: string;
  freeShipping: number;
  currency: string;
}) {
  return (
    <>
      <div className="announcement">
        Considered essentials. Made for everyday living.{" "}
        <span>
          {freeShipping
            ? `Free shipping on orders ${formatMoney(freeShipping, currency)}+`
            : "Free shipping on every order"}
        </span>
      </div>
      <header className="site-header">
        <a href="/" className="brand">
          <span className="brand-mark">e.</span>
          {name}
        </a>
        <nav aria-label="Main navigation">
          <a href="/shop">Shop all</a>
          <a href="/shop?category=home">At home</a>
          <a href="/shop?category=everyday">On the go</a>
        </nav>
        <div className="header-actions">
          <a href="/account">Account</a>
          <CartButton />
        </div>
      </header>
      <CartDrawer />
    </>
  );
}
export function Footer({ name }: { name: string }) {
  return (
    <footer className="site-footer">
      <div>
        <a href="/" className="brand">
          {name}
        </a>
        <p>Fewer things. More everyday possibility.</p>
      </div>
      <nav aria-label="Footer">
        <a href="/shop">The collection</a>
        <a href="/account">Your orders</a>
        <a href="/admin">Store administration</a>
      </nav>
      <small>A small store, thoughtfully put together.</small>
    </footer>
  );
}
