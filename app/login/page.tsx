import type { Metadata } from "next";
import Image from "next/image";

import { HugeiconsIcon } from "@hugeicons/react";
import { SquareLock02Icon } from "@hugeicons/core-free-icons";

import { safeNextPath } from "@/lib/auth";
import { DELIVERY_STATUS, type DeliveryStatus } from "@/lib/orders";
import { cn } from "@/lib/utils";

import { Blossom } from "./blossom";
import { LoginForm } from "./login-form";

// Imported rather than referenced by path so the intrinsic 707×353 comes with
// it — the box is reserved before the bytes arrive, so the form doesn't jump
// down the page as the logo loads.
import logoText from "@/public/logo_text.png";
import logoCircle from "@/public/logo/icon-circle-192.png";

const JOURNEY: DeliveryStatus[] = ["pending", "packing", "shipped", "delivered"];

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
    <main className="grid flex-1 bg-sidebar lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <aside className="relative isolate flex min-h-44 flex-col justify-between overflow-hidden px-6 pt-7 pb-14 text-sidebar-foreground lg:min-h-0 lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(34rem_26rem_at_100%_0%,var(--ralla-700)_0%,transparent_65%)] opacity-70"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,var(--sidebar-border)_1px,transparent_0)] bg-[size:24px_24px] [mask-image:linear-gradient(135deg,black,transparent_60%)]"
        />
        <Blossom className="absolute -top-16 -right-20 -z-10 size-64 animate-[flower-spin_120s_linear_infinite] motion-reduce:animate-none lg:-top-40 lg:-right-40 lg:size-[30rem] xl:-top-44 xl:size-[40rem]" />
        <Blossom className="absolute right-[12%] bottom-[30%] -z-10 hidden size-14 rotate-12 opacity-60 lg:block" />
        <Blossom className="absolute right-[30%] bottom-[14%] -z-10 hidden size-8 -rotate-12 opacity-40 xl:block" />

        <div className="flex items-center gap-3">
          <Image
            src={logoCircle}
            alt=""
            sizes="44px"
            className="size-11 rounded-full ring-1 ring-sidebar-border"
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-[0.18em] text-sidebar-accent-foreground">
              RALLA
            </p>
            <p className="text-xs">Order &amp; delivery admin</p>
          </div>
        </div>

        <div className="hidden max-w-md lg:block">
          <p className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-sidebar-accent-foreground xl:text-5xl">
            Every order, from counter to doorstep.
          </p>
          <ol className="mt-8 flex flex-wrap items-center gap-2">
            {JOURNEY.map((status, index) => (
              <li key={status} className="flex items-center gap-2">
                {index > 0 ? (
                  <span aria-hidden className="h-px w-4 bg-sidebar-foreground/40" />
                ) : null}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                    DELIVERY_STATUS[status].chip,
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("size-1.5 rounded-full", DELIVERY_STATUS[status].dot)}
                  />
                  {DELIVERY_STATUS[status].label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      <section className="relative -mt-8 flex items-start justify-center rounded-t-[2rem] bg-background px-6 pt-10 pb-12 lg:mt-0 lg:items-center lg:rounded-t-none lg:rounded-l-[2.5rem] lg:px-12 lg:py-12">
        <div className="w-full max-w-sm animate-in duration-500 fade-in slide-in-from-bottom-3 motion-reduce:animate-none">
          <Image
            src={logoText}
            alt="RALLA"
            preload
            sizes="140px"
            className="-ml-3 h-auto w-32"
          />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
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
