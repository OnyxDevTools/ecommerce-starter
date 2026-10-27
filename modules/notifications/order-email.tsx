// filename: modules/notifications/order-email.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Preview,
} from "react-email";
import { formatMoney } from "../../lib/money";
import type { Rows } from "../../lib/domain";
export function OrderEmail({
  order,
  lines,
}: {
  order: Rows["Order"];
  lines: Rows["OrderLine"][];
}) {
  return (
    <Html>
      <Head />
      <Preview>Your order has been received</Preview>
      <Body
        style={{ backgroundColor: "#f6f4ec", fontFamily: "Arial,sans-serif" }}
      >
        <Container style={{ padding: "32px", backgroundColor: "#ffffff" }}>
          <Text>eCommerce Starter</Text>
          <Heading>
            {order.mode === "demo"
              ? "Your demonstration order"
              : "Thanks for your order"}
          </Heading>
          <Text>Order {order.id}</Text>
          {order.mode === "demo" && (
            <Text>No payment was taken. This is a demonstration.</Text>
          )}
          {lines.map((l) => (
            <Text key={l.id}>
              {l.quantity} × {l.name} / {l.variant} —{" "}
              {formatMoney(l.total, order.currency)}
            </Text>
          ))}
          <Hr />
          <Text>Total: {formatMoney(order.total, order.currency)}</Text>
          <Text>
            View your order securely in the browser used at checkout, or sign in
            to the account used to place it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
export default OrderEmail;
