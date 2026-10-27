"use client";
// filename: admin/forms.tsx
import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ProductInput,
  VariantInput,
  SettingsInput,
  type Rows,
} from "@/lib/domain";
import type { z } from "zod";
import { description } from "@/modules/catalog/document";
import { request } from "@/components/cart";
import { Button } from "@/components/ui/button";
const Editor = dynamic(() => import("./editor"), {
  ssr: false,
  loading: () => <p>Loading editor…</p>,
});
function useAction() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    router = useRouter();
  async function run(op: string, data: unknown) {
    setMessage("");
    setBusy(true);
    try {
      const result = await request(op, data);
      setMessage("Saved.");
      router.refresh();
      return result;
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { message, busy, run };
}
export function ProductForm({
  product,
  categories,
}: {
  product: Rows["Product"] | null;
  categories: Rows["Category"][];
}) {
  const router = useRouter(),
    action = useAction(),
    form = useForm<z.infer<typeof ProductInput>>({
      resolver: zodResolver(ProductInput),
      defaultValues: (product ? ProductInput.strip().parse(product) : null) || {
        id: "",
        name: "",
        slug: "",
        summary: "",
        description: description(
          "Describe the materials, purpose and care of this piece.",
        ),
        categoryId: categories[0]?.id || "",
        active: false,
        images: '["/products/cup.webp"]',
      },
    });
  const [doc, setDoc] = useState(form.getValues("description"));
  return (
    <form
      className="panel stack"
      onSubmit={form.handleSubmit(async (v) => {
        const result = (await action.run("product", v)) as
          Rows["Product"] | undefined;
        if (result && !product) router.push(`/admin/products/${result.id}`);
      })}
    >
      <h2>Product details</h2>
      {[
        ["name", "Product name"],
        ["slug", "URL slug"],
        ["summary", "Short description"],
      ].map(([name, label]) => (
        <label key={name}>
          {label}
          <input {...form.register(name as "name")} />
          {form.formState.errors[name as "name"] && (
            <span className="error">
              {form.formState.errors[name as "name"]?.message}
            </span>
          )}
        </label>
      ))}
      <label>
        Category
        <select {...form.register("categoryId")}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" {...form.register("active")} /> Visible in store
      </label>
      <div>
        <span className="field-label">Product description</span>
        <Editor
          value={doc}
          onChange={(v) => {
            setDoc(v);
            form.setValue("description", v, { shouldDirty: true });
          }}
        />
      </div>
      <label>
        Gallery image paths (JSON array)
        <textarea {...form.register("images")} />
      </label>
      {product && (
        <label>
          Upload product image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const alt = window.prompt(
                "Describe this product image for accessibility",
                product.name,
              );
              if (!alt) return;
              const data = new FormData();
              data.set("file", file);
              data.set("productId", product.id);
              data.set("alt", alt);
              try {
                const r = await fetch("/api/store/media", {
                    method: "POST",
                    body: data,
                  }),
                  body = await r.json();
                if (!r.ok) throw new Error(body.detail);
                const current = JSON.parse(
                  form.getValues("images"),
                ) as string[];
                form.setValue(
                  "images",
                  JSON.stringify([...current, body.path]),
                );
                window.alert(
                  "Image added to gallery. Save product to publish the change.",
                );
              } catch (e) {
                window.alert((e as Error).message);
              }
            }}
          />
        </label>
      )}
      <p role="status">{action.message}</p>
      {Object.keys(form.formState.errors).length > 0 && (
        <p role="alert">Review the product fields before saving.</p>
      )}
      <Button disabled={action.busy}>Save product</Button>
    </form>
  );
}
export function VariantForm({
  variant,
  productId,
  currency,
}: {
  variant?: Rows["Variant"];
  productId: string;
  currency: Rows["Variant"]["currency"];
}) {
  const a = useAction(),
    form = useForm<z.infer<typeof VariantInput>>({
      resolver: zodResolver(VariantInput),
      defaultValues: (variant ? VariantInput.strip().parse(variant) : null) || {
        id: "",
        productId,
        name: "",
        sku: "",
        price: 0,
        currency,
        stock: 0,
        unlimited: false,
        active: true,
      },
    });
  return (
    <form
      className="panel stack"
      onSubmit={form.handleSubmit((v) => a.run("variant", v))}
    >
      <h3>{variant?.name || "Add a variant"}</h3>
      <div className="form-grid">
        {[
          ["name", "Variant name"],
          ["sku", "SKU"],
          ["price", `Price (${currency} minor units)`],
          ["stock", "Total inventory units"],
        ].map(([name, label]) => (
          <label key={name}>
            {label}
            <input
              type={["price", "stock"].includes(name) ? "number" : "text"}
              {...form.register(name as "name", {
                valueAsNumber: ["price", "stock"].includes(name),
              })}
            />
          </label>
        ))}
      </div>
      <p className="muted">
        Total inventory includes units already sold and reserved. Add received
        stock to this total.
      </p>
      <label className="check">
        <input type="checkbox" {...form.register("unlimited")} /> Unlimited
        availability (no physical stock limit)
      </label>
      <label className="check">
        <input type="checkbox" {...form.register("active")} /> Available for
        purchase
      </label>
      {Object.keys(form.formState.errors).length > 0 && (
        <p role="alert">
          Enter valid variant details and nonnegative whole-number prices and
          stock.
        </p>
      )}
      <p role="status">{a.message}</p>
      <Button disabled={a.busy}>Save variant</Button>
    </form>
  );
}
export function CategoryForm({ category }: { category?: Rows["Category"] }) {
  const a = useAction();
  return (
    <form
      className="panel form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        void a.run("category", {
          id: d.get("id"),
          name: d.get("name"),
          active: d.get("active") === "on",
        });
      }}
    >
      <label>
        Category ID
        <input
          name="id"
          required
          pattern="[a-z0-9-]+"
          defaultValue={category?.id}
          readOnly={!!category}
        />
      </label>
      <label>
        Name
        <input name="name" required defaultValue={category?.name} />
      </label>
      <label className="check">
        <input
          type="checkbox"
          name="active"
          defaultChecked={category?.active ?? true}
        />
        Active
      </label>
      <Button disabled={a.busy}>Save category</Button>
      <p role="status">{a.message}</p>
    </form>
  );
}
export function SettingsForm({
  settings,
}: {
  settings: Rows["StoreSettings"];
}) {
  const a = useAction(),
    form = useForm<z.infer<typeof SettingsInput>>({
      resolver: zodResolver(SettingsInput),
      defaultValues: SettingsInput.strip().parse(settings),
    });
  return (
    <form
      className="panel stack"
      onSubmit={form.handleSubmit((v) => a.run("settings", v))}
    >
      {[
        ["name", "Store name"],
        ["description", "Store description"],
        ["shipping", "Shipping (minor units)"],
        ["freeShipping", "Free shipping threshold (minor units)"],
        ["taxBasisPoints", "Tax rate (basis points; 100 = 1%)"],
        ["discountBasisPoints", "Store-wide discount (basis points)"],
      ].map(([name, label]) => (
        <label key={name}>
          {label}
          <input
            type={["name", "description"].includes(name) ? "text" : "number"}
            {...form.register(name as "name", {
              valueAsNumber: !["name", "description"].includes(name),
            })}
          />
        </label>
      ))}
      <label>
        Currency
        <select {...form.register("currency")}>
          {["USD", "EUR", "GBP", "JPY", "KWD"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Ships to
        <select {...form.register("country")}>
          {["US", "GB", "DE", "JP", "KW"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <p className="notice">
        This starter applies one configured shipping rule, discount and tax
        rate. It is not a tax-compliance engine. Currency changes require a
        deliberate catalog migration.
      </p>
      {Object.keys(form.formState.errors).length > 0 && (
        <p role="alert">
          Review settings: rates and amounts must be within their allowed
          ranges.
        </p>
      )}
      <p role="status">{a.message}</p>
      <Button disabled={a.busy}>Save store settings</Button>
    </form>
  );
}
export function FulfillmentForm({ order }: { order: Rows["Order"] }) {
  const a = useAction();
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        void a.run("fulfill", {
          id: order.id,
          status: new FormData(e.currentTarget).get("status"),
        });
      }}
    >
      <label>
        Fulfillment for {order.id.slice(0, 8)}
        <select name="status" defaultValue={order.fulfillment}>
          {["unfulfilled", "processing", "shipped", "delivered"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <Button disabled={a.busy}>Update fulfillment</Button>
      <p role="status">{a.message}</p>
    </form>
  );
}
export function Maintenance() {
  const a = useAction();
  return (
    <>
      <Button disabled={a.busy} onClick={() => void a.run("maintenance", {})}>
        Run maintenance
      </Button>
      <p role="status">{a.message}</p>
    </>
  );
}
