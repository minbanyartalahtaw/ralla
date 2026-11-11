import type { Metadata } from "next";

import { HugeiconsIcon } from "@hugeicons/react";
import { SquareLock02Icon } from "@hugeicons/core-free-icons";

import { RallaMark, RallaWordmark } from "@/components/ralla-logo";
import { safeNextPath } from "@/lib/auth";

import { LoginForm } from "./login-form";

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
    <main className="grid flex-1 grid-rows-[auto_1fr] gap-3 bg-background p-3 lg:grid-cols-2 lg:grid-rows-1">
      <aside className="relative isolate flex min-h-36 flex-col overflow-hidden rounded-3xl bg-sidebar p-6 text-sidebar-foreground lg:min-h-0 lg:p-12">
        <RallaMark className="pointer-events-none absolute -right-10 -bottom-12 -z-10 size-56 text-sidebar-accent-foreground/10 lg:-right-20 lg:-bottom-24 lg:size-[30rem] xl:size-[36rem]" />

        <RallaWordmark className="h-8 w-auto self-start text-sidebar-accent-foreground lg:h-9" />

        <div className="mt-14 hidden max-w-sm lg:block">
          <p className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-sidebar-accent-foreground xl:text-5xl">
            Every order, from counter to doorstep.
          </p>
          <p className="mt-4 text-sm">Order &amp; delivery admin</p>
        </div>
      </aside>

      <section className="flex items-start justify-center px-3 pt-8 pb-10 lg:items-center lg:px-12 lg:py-12">
        <div className="w-full max-w-sm animate-in duration-500 fade-in slide-in-from-bottom-3 motion-reduce:animate-none">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to manage orders and deliveries.
          </p>
          <div className="mt-8">
            <LoginForm next={target} />
          </div>
          <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
            <HugeiconsIcon icon={SquareLock02Icon} size={14} strokeWidth={1.8} />
            Staff access only
          </p>
        </div>
      </section>
    </main>
  );
}
