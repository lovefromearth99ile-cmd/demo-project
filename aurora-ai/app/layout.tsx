import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aurora AI — Your ideas, in motion",
  description: "A bilingual AI workspace for learning, creating, and exploring.",
  applicationName: "Aurora AI"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}