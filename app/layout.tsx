import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// Inter is the UI face (shadcn's default). Geist Mono carries order IDs and
// money, where tabular figures matter.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RALLA — Order & Delivery Admin",
  description: "Internal admin for tracking RALLA orders and delivery status.",
};


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", inter.variable, geistMono.variable)}
      suppressHydrationWarning
    >
      <head>
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
