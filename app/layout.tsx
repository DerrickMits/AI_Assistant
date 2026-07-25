import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Derrick's AI Assistant",
  description:
    "Interactive operational assistant and knowledge engine for Derrick Odiwuor.",
  authors: [{ name: "Derrick Odiwuor" }],
  metadataBase: new URL(SITE.portfolioUrl),
  openGraph: {
    title: "Derrick's AI Assistant",
    description:
      "Ask about Derrick's career, his articles on The Ledger, and his blueprints in the Resources Hub.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050508",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
