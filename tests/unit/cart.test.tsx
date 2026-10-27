// @vitest-environment jsdom
// filename: tests/unit/cart.test.tsx
import React from "react";
import { it, expect } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { CartProvider, useBag } from "../../components/cart";
function Toggle() {
  const { open, set } = useBag();
  return (
    <button onClick={() => set({ open: true })}>
      {open ? "Open" : "Closed"}
    </button>
  );
}
it("creates isolated Zustand state per provider, preserving the server hydration baseline", () => {
  const first = render(
      <CartProvider>
        <Toggle />
      </CartProvider>,
    ),
    second = render(
      <CartProvider>
        <Toggle />
      </CartProvider>,
    );
  const buttons = document.querySelectorAll("button");
  fireEvent.click(buttons[0]);
  expect(first.container.textContent).toBe("Open");
  expect(second.container.textContent).toBe("Closed");
  cleanup();
});
