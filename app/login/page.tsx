import type { Metadata } from "next";
import Image from "next/image";

import { safeNextPath } from "@/lib/auth";

import { LoginForm } from "./login-form";

// Imported rather than referenced by path so the intrinsic 707×353 comes with
// it — the box is reserved before the bytes arrive, so the form doesn't jump
// down the page as the logo loads.
import logoText from "@/public/logo_text.png";

export const metadata: Metadata = {
  title: "Sign in — RALLA",
  // Nothing here should ever surface in a search result.
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // `?next=` arrives from proxy.ts when someone is bounced off an admin page.
  // Sanitized here as well as in the action, so a crafted link can't even
  // render a hidden field pointing off-site.
  const { next } = await searchParams;
  const target = safeNextPath(typeof next === "string" ? next : undefined);

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-xs">
        {/* The wordmark *is* the heading — it spells RALLA — so it carries the
            h1 and the alt text says the same thing for a screen reader. */}
        <h1>
          <Image
            src={logoText}
            alt="RALLA"
            // Next 16 deprecated `priority` in favour of `preload`. This is the
            // page's LCP element, and there's nothing else competing for it.
            preload
            sizes="176px"
            className="mx-auto h-auto w-44"
          />
        </h1>
        <div className="mt-6 rounded-lg border bg-card p-6">
          <LoginForm next={target} />
        </div>
      </div>
    </main>
  );
}
