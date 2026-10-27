// filename: lib/server.ts
import "server-only";
import { OnyxStore } from "./repository";
import { Orders } from "../modules/orders/service";
import { StripePayments } from "../modules/payments/provider";
export function services() {
  const store = new OnyxStore();
  return { store, orders: new Orders(store, new StripePayments()) };
}
