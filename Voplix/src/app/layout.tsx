import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  title: "Voplix - Telegram Bot Management",
  description: "Manage your Telegram bots, orders, and digital products",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon-32x32.png",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
