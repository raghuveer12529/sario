import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Sario — Premium Sarees, Direct from Weavers",
    template: "%s | Sario",
  },
  description:
    "Shop handloom sarees directly from verified weavers across India. Kanjivaram, Banarasi, Pochampally, and more — with transparent origin stories.",
  keywords: ["sarees", "handloom", "silk sarees", "Indian sarees", "weaver direct"],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Sario",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
