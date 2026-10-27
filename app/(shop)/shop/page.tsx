// filename: app/(shop)/shop/page.tsx
import { services } from "@/lib/server";
import { catalog, settings } from "@/modules/catalog/service";
import { formatMoney } from "@/lib/money";
import { ProductCard } from "@/components/product-card";
export const metadata = {
  title: "The collection",
  alternates: { canonical: "/shop" },
};
export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams,
    data = await catalog(services().store),
    config = await settings(services().store),
    q = String(query.q || "").slice(0, 100),
    category = String(query.category || ""),
    sort = String(query.sort || "name"),
    max = Number(query.max || 0);
  const price = (id: string) =>
    Math.min(
      ...data.variants.filter((v) => v.productId === id).map((v) => v.price),
    );
  const filtered = data.products
    .filter(
      (p) =>
        (!category || p.categoryId === category) &&
        `${p.name} ${p.summary}`.toLowerCase().includes(q.toLowerCase()) &&
        (!max || price(p.id) <= max),
    )
    .sort((a, b) =>
      sort === "price"
        ? price(a.id) - price(b.id)
        : sort === "price-desc"
          ? price(b.id) - price(a.id)
          : a.name.localeCompare(b.name),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 6)),
    page = Math.max(1, Math.min(pages, Math.floor(Number(query.page)) || 1));
  const url = (n: number) =>
    `/shop?${new URLSearchParams({ q, category, sort, max: String(max), page: String(n) })}`;
  return (
    <div className="container collection">
      <span className="eyebrow">THE FIELDWORK COLLECTION</span>
      <h1>Things for living.</h1>
      <p className="intro">
        Useful pieces. Quiet details. A little more intention.
      </p>
      <form className="catalog-filters" action="/shop">
        <label>
          Search
          <input
            name="q"
            defaultValue={q}
            placeholder="Find your next favorite…"
          />
        </label>
        <label>
          Category
          <select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort by
          <select name="sort" defaultValue={sort}>
            <option value="name">Name</option>
            <option value="price">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
        <label>
          Price range
          <select name="max" defaultValue={String(max)}>
            <option value="0">All prices</option>
            <option value="5000">
              Under {formatMoney(5000, config.currency)}
            </option>
            <option value="10000">
              Under {formatMoney(10000, config.currency)}
            </option>
          </select>
        </label>
        <button className="button">Apply</button>
      </form>
      <p className="muted">{filtered.length} considered essentials</p>
      <div className="product-grid">
        {filtered.slice((page - 1) * 6, page * 6).map((p) => (
          <ProductCard key={p.id} product={p} variants={data.variants} />
        ))}
      </div>
      {!filtered.length && (
        <div className="empty">
          <h2>No pieces found.</h2>
          <a href="/shop">Clear your filters</a>
        </div>
      )}
      <nav className="pagination" aria-label="Collection pages">
        {page > 1 && <a href={url(page - 1)}>← Previous</a>}
        <span>
          Page {page} of {pages}
        </span>
        {page < pages && <a href={url(page + 1)}>Next →</a>}
      </nav>
    </div>
  );
}
