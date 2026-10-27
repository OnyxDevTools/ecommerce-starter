"use client";
// filename: components/cart.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import Image from "next/image";
import { Button } from "./ui/button";
import { formatMoney } from "@/lib/money";
import type { readCart } from "@/modules/carts/service";
type Bag = Awaited<ReturnType<typeof readCart>>;
type State = {
  bag: Bag | null;
  open: boolean;
  busy: boolean;
  error: string;
  set: (patch: Partial<State>) => void;
};
const createBag = () =>
  createStore<State>((set) => ({
    bag: null,
    open: false,
    busy: false,
    error: "",
    set,
  }));
const Context = createContext<ReturnType<typeof createBag> | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createBag);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useBag() {
  const store = useContext(Context);
  if (!store) throw new Error("CartProvider required");
  return useStore(store);
}
export async function request<T>(op: string, data?: unknown): Promise<T> {
  const r = await fetch(
    `/api/store/${op}`,
    data === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
  const body = await r.json();
  if (!r.ok) throw new Error(body.detail || "Request failed. Try again.");
  return body;
}
export function useCartActions() {
  const state = useBag();
  const set = state.set;
  const refresh = useCallback(async () => {
    set({ busy: true, error: "" });
    try {
      set({ bag: await request<Bag>("cart") });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ busy: false });
    }
  }, [set]);
  async function change(
    variantId: string,
    quantity: number,
    open = false,
    increment = false,
  ) {
    if (state.busy) return;
    state.set({ busy: true, error: "", ...(open ? { open: true } : {}) });
    try {
      const bag = state.bag || (await request<Bag>("cart"));
      state.set({
        bag: await request<Bag>("cart", {
          variantId,
          quantity: increment
            ? (bag.items.find((x) => x.variantId === variantId)?.quantity ||
                0) + quantity
            : quantity,
          version: bag.version,
        }),
      });
    } catch (e) {
      state.set({ error: (e as Error).message });
      try {
        state.set({ bag: await request<Bag>("cart") });
      } catch {}
    } finally {
      state.set({ busy: false });
    }
  }
  return { ...state, refresh, change };
}
export function CartButton() {
  const { bag, set, refresh } = useCartActions();
  return (
    <button
      className="bag-button"
      onClick={() => {
        set({ open: true });
        void refresh();
      }}
    >
      Bag <span>{bag?.items.reduce((n, x) => n + x.quantity, 0) || 0}</span>
    </button>
  );
}
export function CartContents() {
  const { bag, busy, error, change, refresh } = useCartActions();
  return (
    <>
      {error && (
        <p role="alert" className="error">
          {error} <button onClick={() => void refresh()}>Reload bag</button>
        </p>
      )}
      {!bag ? (
        <p role="status">Loading your bag…</p>
      ) : !bag.lines.length ? (
        <div className="empty">
          <h2>A little room for something good.</h2>
          <p>Your bag is empty.</p>
          <a href="/shop" className="button">
            Explore the collection →
          </a>
        </div>
      ) : (
        <>
          {bag.lines.map((l) => (
            <article className="bag-line" key={l.variantId}>
              <Image
                src={l.image}
                width={100}
                height={100}
                alt={l.name}
                unoptimized={l.image.startsWith("/media/")}
              />
              <div>
                <strong>{l.name}</strong>
                <p>{l.variant}</p>
                <label>
                  Quantity{" "}
                  <input
                    aria-label={`Quantity for ${l.name}`}
                    type="number"
                    min="0"
                    max="20"
                    value={l.quantity}
                    disabled={busy || !!bag.orderId}
                    onChange={(e) =>
                      void change(l.variantId, Number(e.target.value))
                    }
                  />
                </label>
                <button
                  className="text-button"
                  disabled={busy || !!bag.orderId}
                  onClick={() => void change(l.variantId, 0)}
                >
                  Remove {l.name}
                </button>
              </div>
              <span>{formatMoney(l.total, bag.currency)}</span>
            </article>
          ))}
          <Totals bag={bag} />
          {bag.orderId ? (
            <a className="button" href={`/orders/${bag.orderId}`}>
              Resume checkout →
            </a>
          ) : (
            <a className="button" href="/checkout">
              Continue to checkout →
            </a>
          )}
        </>
      )}
    </>
  );
}
export function Totals({
  bag,
}: {
  bag: Pick<
    Bag,
    "subtotal" | "discount" | "shipping" | "tax" | "total" | "currency"
  >;
}) {
  return (
    <dl className="totals">
      {[
        ["Subtotal", bag.subtotal],
        ["Discount", -bag.discount],
        ["Shipping", bag.shipping],
        ["Estimated tax", bag.tax],
        ["Total", bag.total],
      ].map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{formatMoney(Number(value), bag.currency)}</dd>
        </div>
      ))}
    </dl>
  );
}
export function CartDrawer() {
  const { open, set } = useBag(),
    ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="cart-drawer"
      aria-label="Your bag"
      onCancel={() => set({ open: false })}
    >
      <div className="section-heading">
        <h2>Your bag</h2>
        <button aria-label="Close bag" onClick={() => set({ open: false })}>
          ✕
        </button>
      </div>
      {open && (
        <>
          <CartContents />
          <a href="/cart">View full bag</a>
        </>
      )}
    </dialog>
  );
}
export function CartPage() {
  const { refresh } = useCartActions();
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return <CartContents />;
}
export function AddToBag({
  variants,
}: {
  variants: {
    id: string;
    name: string;
    price: number;
    currency: string;
    available: number;
  }[];
}) {
  const [id, setId] = useState(variants[0]?.id || ""),
    { busy, error, change } = useCartActions(),
    v = variants.find((x) => x.id === id);
  return (
    <div className="buy-box">
      <label>
        Choose your finish
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} · {formatMoney(v.price, v.currency)}
            </option>
          ))}
        </select>
      </label>
      <p className="availability">
        {v && v.available > 0
          ? "● Available for your everyday"
          : "Currently unavailable"}
      </p>
      <Button
        size="lg"
        disabled={busy || !v || v.available < 1}
        onClick={() => void change(id, 1, true, true)}
      >
        {busy ? "Adding…" : "Add to bag →"}
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
