// filename: scripts/maintenance.ts
import { services } from "../lib/server";
console.log(await services().orders.maintain());
