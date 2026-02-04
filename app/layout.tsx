import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import MobileNav from "@/components/MobileNav";
import CommandPalette from "@/components/CommandPalette";
import KeyboardHint from "@/components/KeyboardHint";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OpenClaw UI",
  description: "Beautiful interface for OpenClaw/Clawdbot setup and management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OpenClaw",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground min-h-screen pb-16 md:pb-0`}>
        {children}
        <MobileNav />
        <CommandPalette />
        <KeyboardHint />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a1a22',
              color: '#fff',
              border: '1px solid #27272a',
            },
          }}
        />
      </body>
    </html>
  );
}
