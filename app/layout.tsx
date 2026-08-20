import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

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
  icons: {
    icon: "/logo/icon-circle-192.png",
    apple: "/logo/icon-circle-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RALLA",
  },
};

export const viewport: Viewport = {
  themeColor: "#a53860",
  // Default mobile behavior overlays the keyboard on top of the page and
  // leaves the layout viewport full-height, so a fixed-position sheet (like
  // the assistant) gets scrolled to keep the focused textarea visible and
  // its header ends up dragged off-screen. Resizing the viewport itself
  // means 100dvh/inset-y-0 shrink to fit above the keyboard instead.
  interactiveWidget: "resizes-content",
};


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", inter.variable, geistMono.variable)}
      suppressHydrationWarning
    >
      <head>
        {/* Sets `.dark` before the first paint. It has to be an inline,
            render-blocking script: any React effect runs after the browser has
            already painted, so a staff member on dark mode would get a white
            flash on every cold load. An explicit choice in localStorage wins;
            with none stored, the OS preference decides. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.theme;if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
