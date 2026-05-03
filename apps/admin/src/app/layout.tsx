import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../../node_modules/@sario/ui/src/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = { title: { default: "Sario Admin", template: "%s | Sario Admin" } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
