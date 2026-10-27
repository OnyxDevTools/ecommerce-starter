// filename: app/(shop)/account/page.tsx
import { redirect } from "next/navigation";
import { actor } from "@/lib/auth/identity";
import { services } from "@/lib/server";
import { all } from "@/lib/data";
import { formatMoney } from "@/lib/money";
import { SignOut } from "@/admin/sign-out";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await actor();
  if (!user) redirect("/sign-in");
  const orders = await all(services().store, "Order", { customerId: user.id });
  return (
    <div className="container narrow">
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h1>Hello, {user.name.split(" ")[0]}.</h1>
      <SignOut />
      <h2>Your orders</h2>
      {orders.map((o) => (
        <a key={o.id} className="order-line" href={`/orders/${o.id}`}>
          <span>
            {o.id.slice(0, 8)} ·{" "}
            {o.mode === "demo" ? "Demonstration" : o.payment}
          </span>
          <strong>{formatMoney(o.total, o.currency)}</strong>
        </a>
      ))}
      {!orders.length && (
        <p>No orders yet. Orders placed while signed in will appear here.</p>
      )}
      {user.admin && (
        <a className="button" href="/admin">
          Open store administration →
        </a>
      )}
    </div>
  );
}
