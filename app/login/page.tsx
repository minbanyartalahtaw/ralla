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
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-ralla-900 px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(36rem_22rem_at_15%_10%,var(--ralla-600)_0%,transparent_60%),radial-gradient(30rem_20rem_at_85%_15%,var(--ralla-300)_0%,transparent_55%),radial-gradient(40rem_26rem_at_50%_110%,var(--ralla-700)_0%,transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.22)_1px,transparent_0)] bg-[size:22px_22px] [mask-image:radial-gradient(42rem_30rem_at_50%_45%,black_30%,transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-ralla-300/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-ralla-50/20 blur-3xl"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-card p-8 shadow-2xl shadow-black/30">
        <h1>
          <Image
            src={logoText}
            alt="RALLA"
            preload
            sizes="140px"
            className="mx-auto h-auto w-32"
          />
        </h1>
        <div className="mt-8">
          <LoginForm next={target} />
        </div>
      </div>
    </main>
  );
}
