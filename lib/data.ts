// filename: lib/data.ts
import "server-only";
import { randomUUID } from "node:crypto";
import type { Store } from "./repository";
import { AppError, type Rows, type Table } from "./domain";
export async function all<K extends Table>(
  store: Store,
  table: K,
  where?: Partial<Rows[K]>,
) {
  const rows: Rows[K][] = [];
  let cursor: string | undefined;
  do {
    const page = await store.list(table, { where, cursor, limit: 200 });
    rows.push(...page.items);
    cursor = page.cursor;
    if (rows.length > 2000)
      throw new AppError(
        503,
        "This store exceeds the starter scan budget. Add indexed pagination.",
      );
  } while (cursor);
  return rows;
}
export async function put<K extends Table>(
  store: Store,
  table: K,
  row: Rows[K],
) {
  if (await store.get(table, row.id)) {
    if (!(await store.update(table, row.id, {}, row)))
      throw new AppError(
        503,
        "Record changed unexpectedly. Reconcile before retrying.",
      );
  } else await store.insert(table, row);
}
// Fixed durable lock: no time-based takeover and no process-local synchronization.
export async function locked<T>(store: Store, fn: () => Promise<T>) {
  await store.insert("CommerceLock", {
    id: "commerce",
    owner: randomUUID(),
    createdAt: new Date().toISOString(),
  });
  try {
    const value = await fn();
    await store.delete("CommerceLock", "commerce");
    return value;
  } catch (error) {
    if (error instanceof AppError && error.status < 500)
      await store.delete("CommerceLock", "commerce");
    throw error;
  }
}
export const now = () => new Date().toISOString();
