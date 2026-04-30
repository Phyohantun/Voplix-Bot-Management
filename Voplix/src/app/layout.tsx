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
    icon: "/Voplix.PNG",
    apple: "/Voplix.PNG",
    shortcut: "/Voplix.PNG",
  },
  openGraph: {
    title: "Voplix - Telegram Bot Management",
    description: "Manage your Telegram bots, orders, and digital products",
    images: ["/Voplix.PNG"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Voplix - Telegram Bot Management",
    description: "Manage your Telegram bots, orders, and digital products",
    images: ["/Voplix.PNG"],
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
