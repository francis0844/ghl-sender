import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import CapacitorInit from "@/components/CapacitorInit";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Required so env(safe-area-inset-*) values are populated on notched devices
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "GHL Sender",
  description: "Search GoHighLevel contacts and send messages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full bg-background text-foreground">
        <CapacitorInit />
        {children}
      </body>
    </html>
  );
}
