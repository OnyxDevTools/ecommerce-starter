"use client";
// filename: components/checkout.tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Address, type Rows } from "@/lib/domain";
import type { z } from "zod";
import { useCartActions, Totals, request } from "./cart";
import { Button } from "./ui/button";
export function Checkout({
  mode,
  country,
}: {
  mode: "demo" | "stripe" | "disabled";
  country: string;
}) {
  const { bag, refresh } = useCartActions(),
    [error, setError] = useState("");
  const form = useForm<z.infer<typeof Address>>({
    resolver: zodResolver(Address),
    defaultValues: {
      name: "",
      email: "",
      line1: "",
      city: "",
      postal: "",
      country: country as z.infer<typeof Address>["country"],
    },
  });
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <div className="checkout-grid">
      <form
        onSubmit={form.handleSubmit(async (address) => {
          setError("");
          try {
            if (!bag || mode === "disabled")
              throw new Error("Checkout is not configured.");
            const order = await request<Rows["Order"]>("checkout", {
              address,
              mode,
              version: bag.version,
            });
            window.location.assign(
              order.mode === "stripe" && order.sessionUrl
                ? order.sessionUrl
                : `/orders/${order.id}`,
            );
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        <h2>Where should it go?</h2>
        <p>
          Guest checkout is welcome. <a href="/sign-in">Sign in</a> before
          ordering to add this purchase to your account.
        </p>
        {[
          ["name", "Full name"],
          ["email", "Email address"],
          ["line1", "Street address"],
          ["city", "City"],
          ["postal", "Postal code"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type={key === "email" ? "email" : "text"}
              {...form.register(key as keyof z.infer<typeof Address>)}
            />
            {form.formState.errors[key as keyof z.infer<typeof Address>] && (
              <span className="error">
                {
                  form.formState.errors[key as keyof z.infer<typeof Address>]
                    ?.message
                }
              </span>
            )}
          </label>
        ))}
        <label>
          Country
          <select {...form.register("country")}>
            <option value={country}>
              {
                (
                  {
                    US: "United States",
                    GB: "United Kingdom",
                    DE: "Germany",
                    JP: "Japan",
                    KW: "Kuwait",
                  } as Record<string, string>
                )[country]
              }
            </option>
          </select>
        </label>
        {mode === "demo" && (
          <p className="notice">
            Demonstration checkout. No card details, payment or real shipment.
            Your demo order will be saved.
          </p>
        )}
        {mode === "disabled" && (
          <p className="error">The store owner has not enabled checkout.</p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Button
          size="lg"
          disabled={
            form.formState.isSubmitting ||
            !bag?.lines.length ||
            mode === "disabled"
          }
        >
          {form.formState.isSubmitting
            ? "Preparing order…"
            : mode === "demo"
              ? "Place demonstration order →"
              : "Continue to secure payment →"}
        </Button>
      </form>
      <aside className="summary panel">
        <h2>Order summary</h2>
        {bag?.lines.map((l) => (
          <p key={l.variantId}>
            {l.quantity} × {l.name} <small>{l.variant}</small>
          </p>
        ))}
        {bag && <Totals bag={bag} />}
        <p className="muted">
          Totals are recalculated by the store at checkout. Tax is a simple
          configured-rate estimate.
        </p>
      </aside>
    </div>
  );
}
export function CancelOrder({ id }: { id: string }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await request("cancel", { id });
            window.location.reload();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        Cancel pending checkout
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
