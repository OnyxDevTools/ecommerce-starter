// filename: lib/money.ts
import Decimal from "decimal.js";
import { Currency, type Rows } from "./domain";
export const exponents = { USD: 2, EUR: 2, GBP: 2, JPY: 0, KWD: 3 } as const;
export function formatMoney(amount: number, currency: string) {
  const c = Currency.parse(currency);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: c,
  }).format(
    new Decimal(amount).div(new Decimal(10).pow(exponents[c])).toNumber(),
  );
}
export function totals(
  lines: { unitPrice: number; quantity: number }[],
  settings: Rows["StoreSettings"],
) {
  const subtotal = lines.reduce(
    (sum, l) => sum.plus(new Decimal(l.unitPrice).times(l.quantity)),
    new Decimal(0),
  );
  const discount = subtotal
    .times(settings.discountBasisPoints)
    .div(10000)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  const net = subtotal.minus(discount);
  const shipping = net.gte(settings.freeShipping) ? 0 : settings.shipping;
  const tax = net
    .plus(shipping)
    .times(settings.taxBasisPoints)
    .div(10000)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return {
    subtotal: subtotal.toNumber(),
    discount: discount.toNumber(),
    shipping,
    tax: tax.toNumber(),
    total: net.plus(shipping).plus(tax).toNumber(),
  };
}
