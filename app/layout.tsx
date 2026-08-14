import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Elara — AI Operational Assistant",
  description:
    "Elara is Derrick Odiwuor's personal AI collaborator — an operational assistant grounded in his career, articles, and blueprints.",
  authors: [{ name: "Derrick Odiwuor" }],
  metadataBase: new URL(SITE.portfolioUrl),
  openGraph: {
    title: "Elara — AI Operational Assistant",
    description:
      "Meet Elara, Derrick Odiwuor's AI collaborator. Ask about his career, articles on The Ledger, and downloadable blueprints.",
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
