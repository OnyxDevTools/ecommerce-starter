// filename: tests/fixture/preview.ts
// Explicit test transport only. The application has no fixture fallback.
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { mkdir, writeFile, mkdtemp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { OnyxStore } from "../../lib/repository";
import { seed } from "../../scripts/seed";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

type Row = Record<string, unknown>;
const tables = new Map<string, Map<string, Row>>(),
  documents = new Map<string, Row>();
const table = (name: string) => {
  if (!tables.has(name)) tables.set(name, new Map());
  return tables.get(name)!;
};
const object = (value: unknown): Row =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
function matches(row: Row, value: unknown): boolean {
  const c = object(value);
  if (!Object.keys(c).length) return true;
  if (c.condition) return matches(row, c.condition);
  if (Array.isArray(c.conditions))
    return c.operator === "OR"
      ? c.conditions.some((child) => matches(row, child))
      : c.conditions.every((child) => matches(row, child));
  const criteria = object(c.criteria || c),
    actual = row[String(criteria.field)],
    expected = criteria.value;
  switch (criteria.operator) {
    case "EQUAL":
      return actual === expected;
    case "NOT_EQUAL":
      return actual !== expected;
    case "STARTS_WITH":
      return String(actual).startsWith(String(expected));
    default:
      throw new Error(`Unsupported test operator ${String(criteria.operator)}`);
  }
}
const server = createServer(
  async (request: IncomingMessage, response: ServerResponse) => {
    const send = (status: number, value: unknown) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(value));
    };
    try {
      const url = new URL(request.url || "/", "http://fixture"),
        parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = chunks.length
        ? object(JSON.parse(Buffer.concat(chunks).toString()))
        : {};
      if (
        request.headers["x-onyx-key"] !== "fixture-key" ||
        request.headers["x-onyx-secret"] !== "fixture-secret"
      )
        return send(401, { message: "Test credentials required" });
      if (parts[0] !== "data" || parts[1] !== "fixture") return send(404, {});
      if (parts[2] === "document") {
        if (request.method === "PUT") {
          documents.set(String(body.documentId), body);
          return send(200, body);
        }
        const value = documents.get(parts[3]);
        return send(value ? 200 : 404, value || {});
      }
      if (parts[2] === "query") {
        const update = parts[3] === "update",
          name = parts[update ? 4 : 3],
          records = table(name);
        const rows = Array.from(records.values())
          .filter((row) => matches(row, body.conditions))
          .sort((a, b) => String(a.id).localeCompare(String(b.id)));
        if (update) {
          for (const row of rows)
            records.set(String(row.id), { ...row, ...object(body.updates) });
          return send(200, rows.length);
        }
        const start = Number(url.searchParams.get("nextPage") || 0),
          size = Number(url.searchParams.get("pageSize") || 20),
          page = rows.slice(start, start + size);
        const selected =
          Array.isArray(body.fields) && body.fields.length
            ? page.map((row) =>
                Object.fromEntries(
                  (body.fields as string[]).map((key) => [key, row[key]]),
                ),
              )
            : page;
        return send(200, {
          records: selected,
          ...(start + size < rows.length
            ? { nextPage: String(start + size) }
            : {}),
        });
      }
      const records = table(parts[2]),
        id = parts[3] || String(body.id);
      if (request.method === "GET") {
        const row = records.get(id);
        return send(row ? 200 : 404, row || {});
      }
      if (request.method === "DELETE") {
        records.delete(id);
        return send(200, true);
      }
      if (request.method === "POST") {
        if (records.has(id))
          return send(409, { message: "Duplicate identifier" });
        records.set(id, body);
        return send(201, body);
      }
      return send(404, {});
    } catch (error) {
      console.error(
        "Fixture error",
        error instanceof Error ? error.message : "unknown",
      );
      send(500, { message: "Test fixture failed" });
    }
  },
);
await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
const address = server.address();
if (!address || typeof address === "string") throw new Error("No fixture port");
await mkdir(".test-runtime", { recursive: true });
const runtime = await mkdtemp(resolve(".test-runtime/fixture-"));
const config = resolve(runtime, "onyx-database.json");
for (const key of [
  "ONYX_DATABASE_ID",
  "ONYX_DATABASE_BASE_URL",
  "ONYX_DATABASE_API_KEY",
  "ONYX_DATABASE_API_SECRET",
  "ONYX_DEBUG",
])
  delete process.env[key];
await writeFile(
  config,
  JSON.stringify({
    databaseId: "fixture",
    baseUrl: `http://127.0.0.1:${address.port}`,
    apiKey: "fixture-key",
    apiSecret: "fixture-secret",
  }),
);
process.env.ONYX_CONFIG_PATH = config;
const store = new OnyxStore();
await seed(store);
const appPort = process.env.TEST_PORT || "3050";
Object.assign(process.env, {
  APP_ENV: "preview",
  CHECKOUT_MODE: "demo",
  EMAIL_MODE: "preview",
  APP_ORIGIN: `http://127.0.0.1:${appPort}`,
  FIREBASE_PROJECT_ID: "demo-ecommerce-starter",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9399",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-ecommerce-starter",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-ecommerce-starter.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: "http://127.0.0.1:9399",
});
const emulator = spawn(
  process.execPath,
  [
    "node_modules/firebase-tools/lib/bin/firebase.js",
    "emulators:start",
    "--only",
    "auth",
    "--project",
    "demo-ecommerce-starter",
    "--config",
    "tests/emulators/firebase.json",
  ],
  { stdio: "ignore", env: process.env },
);
process.once("exit", () => emulator.kill("SIGTERM"));
let emulatorReady = false;
for (let attempt = 0; attempt < 200; attempt++) {
  if (emulator.exitCode !== null)
    throw new Error("Store Firebase Auth Emulator exited.");
  try {
    if (
      (
        await fetch(
          "http://127.0.0.1:9399/emulator/v1/projects/demo-ecommerce-starter/config",
        )
      ).ok
    ) {
      emulatorReady = true;
      break;
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 150));
}
if (!emulatorReady)
  throw new Error("Store Firebase Auth Emulator did not start.");
const auth = getAuth(initializeApp({ projectId: "demo-ecommerce-starter" }));
for (const [id, email, name] of [
  ["store-admin", "admin@example.test", "Alex Morgan"],
  ["store-customer", "customer@example.test", "Jamie Customer"],
]) {
  try {
    await auth.createUser({
      uid: id,
      email,
      displayName: name,
      emailVerified: true,
      password: "development-test-password",
    });
  } catch (error) {
    if (!(
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "auth/uid-already-exists"
    ))
      throw error;
  }
}
await store.insert("Customer", {
  id: "store-admin",
  email: "admin@example.test",
  name: "Alex Morgan",
  role: "administrator",
  active: true,
});
if (!process.env.TEST_PORT || process.env.TEST_PORT === "3050")
  await writeFile(
    ".test-runtime/ports.json",
    JSON.stringify({ transport: `http://127.0.0.1:${address.port}` }),
  );
const production = process.argv.includes("--production"),
  port = process.env.TEST_PORT || "3050";
if (production) {
  await new Promise<void>((resolve, reject) => {
    const build = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "build"],
      { stdio: "inherit", env: process.env },
    );
    build.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error("Store fixture production build failed.")),
    );
    build.once("error", reject);
  });
}
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    production ? "start" : "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      ONYX_CONFIG_PATH: config,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);
let closing = false;
const close = () => {
  if (closing) return;
  closing = true;
  child.kill("SIGTERM");
  emulator.kill("SIGTERM");
  server.close();
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
child.on("exit", async (code) => {
  emulator.kill("SIGTERM");
  server.closeAllConnections();
  server.close();
  await rm(runtime, { recursive: true, force: true });
  process.exit(code || 0);
});
