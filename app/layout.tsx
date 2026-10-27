// filename: app/layout.tsx
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
const inter = localFont({
  src: "../public/fonts/inter-latin.woff2",
  variable: "--font-sans",
  display: "swap",
});
export const runtime = "nodejs";
export const metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || "http://127.0.0.1:3000"),
  robots:
    process.env.APP_ENV === "production"
      ? undefined
      : { index: false, follow: false },
  title: { default: "eCommerce Starter", template: "%s · eCommerce Starter" },
  description: "Considered essentials for everyday living.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
