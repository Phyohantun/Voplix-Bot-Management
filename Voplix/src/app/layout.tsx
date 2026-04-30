import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** DM Sans SemiBold only (600) — wordmark / brand text */
const voplixWordmark = DM_Sans({
  variable: "--font-voplix-wordmark",
  subsets: ["latin"],
  weight: ["600"],
});

const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  title: "Voplix - Telegram Bot Management",
  description: "Manage your Telegram bots, orders, and digital products",
  // Tab favicon: `src/app/favicon.ico` (Next.js serves it at /favicon.ico). Keep apple touch separate.
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Voplix - Telegram Bot Management",
    description: "Manage your Telegram bots, orders, and digital products",
    images: ["/android-chrome-512x512.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Voplix - Telegram Bot Management",
    description: "Manage your Telegram bots, orders, and digital products",
    images: ["/android-chrome-512x512.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${voplixWordmark.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
