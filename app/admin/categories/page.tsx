// filename: app/admin/categories/page.tsx
import { adminServices as services } from "@/lib/auth/admin-access";
import { all } from "@/lib/data";
import { CategoryForm } from "@/admin/forms";
export default async function Page() {
  const rows = await all((await services()).store, "Category");
  return (
    <>
      <h1>Categories.</h1>
      {rows.map((c) => (
        <CategoryForm key={c.id} category={c} />
      ))}
      <h2>Add a category</h2>
      <CategoryForm />
    </>
  );
}
