// filename: scripts/recover-lock.ts
import { OnyxStore } from "../lib/repository";
if (
  !process.argv.includes("--confirm-writers-stopped") ||
  !process.argv.includes("--confirm-state-reviewed")
)
  throw new Error(
    "Stop all app instances and maintenance writers. Inspect unfinished order/reservation/payment writes before using --confirm-writers-stopped --confirm-state-reviewed.",
  );
await new OnyxStore().delete("CommerceLock", "commerce");
console.log(
  "Inspected commerce lock released. Run maintenance before reopening checkout.",
);
