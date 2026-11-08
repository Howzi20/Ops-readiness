import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Operations Readiness", template: "%s · Operations Readiness" },
  description: "Site operational readiness tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
