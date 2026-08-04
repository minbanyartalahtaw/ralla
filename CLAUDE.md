@AGENTS.md

# RALLA — Cosmetic POS Store Management

Internal **admin-only web app** for RALLA, a cosmetics store. Its job is to let staff
track **orders** and their **delivery status**. Online website only — there is no
customer-facing storefront and no native/offline POS terminal in this repo.

## Scope

**In scope**
🌸
- Admin pages for viewing and managing orders.
- Delivery status tracking (status per order, updated by admin).
- Whatever supporting UI those two need (auth for admins, lists, filters, detail views).

**Out of scope (unless the user says otherwise)**

- Customer-facing pages, public product catalog, checkout.
- Payment processing.
- Anything not asked for — this project is early and the owner will expand the spec
  incrementally. Build what is requested; don't invent modules ahead of the ask.

> This file is intentionally short. The owner will extend it as features land. When a
> real decision is made (schema, auth provider, status model), record it here.

## Stack

- **Next.js 16.3.0**, App Router, Turbopack — read the note in `AGENTS.md` first: this
  Next.js differs from what you may remember. Consult
  `node_modules/next/dist/docs/01-app/` before writing routing, data-fetching, caching,
  or metadata code. Useful entry points:
  - `01-getting-started/03-layouts-and-pages.md`
  - `01-getting-started/06-fetching-data.md`, `07-mutating-data.md`
  - `01-getting-started/15-route-handlers.md`
  - `02-guides/authentication.md`, `02-guides/forms.md`
- **React 19.2.8** — Server Components by default; add `"use client"` only where
  interactivity actually requires it.
- **TypeScript**, strict mode. Path alias `@/*` → repo root.
- **Tailwind CSS v4** via `@tailwindcss/postcss`. Config lives in CSS (`@theme inline`
  in `app/globals.css`), **not** in a `tailwind.config.js`.
- **shadcn** (`style: base-mira`, built on **Base UI**, not Radix) for components.
  Add them with `npx shadcn@latest add <name>` — they land in `components/ui/`.
  The CLI rewrites `app/globals.css`; after running it, re-check that `--primary`,
  `--accent` and the font tokens still point at the RALLA values (see Theme).
- **hugeicons** for icons: `<HugeiconsIcon icon={Search01Icon} />`, names imported
  from `@hugeicons/core-free-icons`.
- **Inter** for UI text, **Geist Mono** for order IDs and money.
- ESLint 9 with `eslint-config-next`.

## Commands

```bash
npm run dev     # dev server (Turbopack)
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

No test runner is set up yet.

## Layout

```
app/
  layout.tsx      # fonts, no-flash dark-mode script, html/body shell
  page.tsx        # theme & component reference — NOT the real dashboard
  globals.css     # Tailwind import + all theme tokens
components/ui/    # shadcn components (generated — edit, don't hand-write)
lib/utils.ts      # cn() — clsx + tailwind-merge
```

The real order screens are yet to be built. `app/page.tsx` is a static style guide;
move it to `/styleguide` or delete it once real routes exist.

Prefer colocating route-specific components inside their route folder; promote to a
shared `components/` directory only once something is used by two or more routes.

## Theme

RALLA's palette is **berry / rose**, not fire-engine red — hues sit at 337–347°.

```
#f9dbbd  peach, warm surface (hue 30° — the outlier)
#ffa5ab  light pink, sidebar text
#da627d  mid pink — fill and border only
#a53860  primary action
#450920  foreground, sidebar slab
```

All of it lives in `app/globals.css`. Rules that matter:

- **Use shadcn's semantic names in components** — `bg-card`, `text-muted-foreground`,
  `border-border`, `bg-primary`. The raw `--ralla-*` ramp exists only to give those
  tokens their values. A component reaching for `bg-ralla-600` directly is a bug
  (the style guide's color swatches are the one exception).
- **`#da627d` is never body text.** It hits 3.5:1 on white and fails AA. Fills,
  borders and chart series only. `#450920` on it is fine at 4.6:1.
- **Primary is berry, destructive is true red (`#b91c1c`, hue 0°)** and always ships
  with a warning icon, so "cancel order" can never be misread as the primary action.
- **Delivery-status colors sit outside the berry hue family** on purpose (amber /
  purple / blue / green), and every one is paired with a text label — never hue alone.
- Order and delivery statuses live in one shared union type. Never hand-type the
  string literals at a call site.
- Keep text at WCAG AA (4.5:1 body). The contrast numbers are recorded in the
  `globals.css` header comment — update them if you change a color.
- **Dark mode is class-based** (`.dark` on `<html>`), per shadcn — not a media query.
  The inline script in `app/layout.tsx` sets it from `localStorage.theme` or the OS
  preference before first paint. Every token has a `.dark` value; keep both working.
- Money is an integer count of kyats. Never a float. Add `.numeric` to anything with
  digits so tabular figures line up down a column.

## Domain

**`Customer.id` is the identity. The TikTok handle is not.** Orders arrive through
TikTok, so the handle is how staff *find* a customer — but its owner can rename it at
any time. It is a mutable, unique lookup index; anything that needs to reference a
customer stores `id`.

Handles are stored normalized (lowercase, no `@`). `normalizeTiktokUsername()` in
`lib/customers.ts` accepts `@name`, `name`, or a pasted profile URL and reduces all
three to the same handle. Always normalize before comparing or storing.

**An order copies the customer's details, it doesn't just link to them.** `Order`
carries its own `customer`, `phone`, `city` and `address`. If someone moves house,
last year's orders must still show where they were actually delivered — a live join
would silently rewrite delivery history. The customer record is the *default* used to
fill a new order, not the source of truth for a past one.

New orders always start `pending`; the create form doesn't get to choose the status.

Storage is `lib/order-store.ts` and `lib/customer-store.ts` — **in-memory arrays, not
a database**. Data is lost on restart and isn't shared between serverless instances.
Both files exist so the flows are testable before a database is picked; keep the
exported function signatures and swap the bodies. Nothing else in the app touches
storage.

## Conventions

- TypeScript everywhere; no `any` in committed code.
- Server Components by default. `"use client"` only where interactivity needs it —
  the style guide page is fully static and stays a Server Component.
- Server Actions for mutations; avoid client-side fetch waterfalls.
- Match the surrounding file's style. Comment only what isn't obvious from the code.
