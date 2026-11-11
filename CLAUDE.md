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

npm run db:up      # start Postgres in Docker
npm run db:migrate # apply migrations (hangs after applying — Ctrl+C is safe,
                   #   then run `npx prisma generate` separately)
npm run db:seed    # reset to the development fixtures
npm run db:studio  # browse the data
```

No test runner is set up yet.

## Layout

```
app/
  page.tsx            # redirect only — there is no landing page
  globals.css         # all theme tokens
  login/              # the sign-in form; the one route outside /user
  user/               # the admin app; /user redirects to /user/dashboard
    layout.tsx        # sidebar + breadcrumb shell
    dashboard/ order/ customer/ product/
    theme/            # theme & component reference — see below
components/ui/        # shadcn components (generated — regenerate, don't hand-write)
lib/                  # domain (orders, customers) + *-store.ts persistence
prisma/               # schema, migrations, seed
docs/                 # runbooks — production-migrations.md before touching prod
generated/prisma/     # Prisma client — gitignored, made by `prisma generate`
```

**There is no landing page.** RALLA has no public face, so `/` only redirects to
`/user/dashboard` — which `proxy.ts` turns into `/login` for anyone without a session.

`/user/theme` is the style guide: every token in `globals.css` rendered once. It is
**deliberately unlinked** — no nav entry, no button, nothing anywhere points at it, and
it is reachable only by typing the URL. It lives under `/user` so it still needs a
session; it is a component gallery, not something a customer or a passer-by should
find. Keep it that way when adding to the sidebar.

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
- **Delivery status is a traffic light**: pending red, packing purple, shipped
  yellow, delivered green, cancelled grey. Every one is paired with a text label —
  never hue alone. All ten light/dark pairings clear AA (4.5:1) on their tint.
- **Pending red is the same red as `--destructive`.** A true red is the only hue
  that reads as red without colliding with the berry brand, and lighter reds fail
  AA on a tinted background. They stay distinguishable by *form*: a status is a
  soft pill with a dot, destructive UI is a solid button with a warning icon.
  Don't add more red UI without checking it can't be mistaken for either.
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

**`Customer.id` is the identity.** Nothing else about a customer is stable: name,
phone, city and address are all editable, and `code` is display-facing. Anything that
needs to reference a customer stores `id`.

**The TikTok handle was removed in August 2026** (`customer_tiktok_optional` then
`drop_customer_tiktok`) — the client stopped wanting it recorded. Staff now find a
customer by name, `RLC-` code or phone; those three are what `listCustomers()` and
`searchCustomers()` match on. Don't reintroduce a per-platform handle column without a
reason to store one: it was a second identity to keep correct, and nothing depended on
it. See the migration comments for the two-step pattern to reuse when dropping a
column that production is still writing.

**Detail URLs address a record by its `code`, not its `id`.** `/user/customer/RLC-1015`
is the row staff are already looking at, so a pasted link reads as the record it came
from; `id` is an internal surrogate that is never displayed. Codes are matched
case-insensitively — they are stored uppercase, but URLs come back lowercased often
enough that an exact match would 404 on a link that is otherwise correct.

**An order copies the customer's details, it doesn't just link to them.** `Order`
carries its own `customer`, `phone`, `city` and `address`. If someone moves house,
last year's orders must still show where they were actually delivered — a live join
would silently rewrite delivery history. The customer record is the *default* used to
fill a new order, not the source of truth for a past one.

New orders always start `pending`; the create form doesn't get to choose the status.

Order codes are `RL-260804TXI` — RL, the **Yangon** date as YYMMDD, then three random
letters, from `generateOrderCode()`. 26³ = 17,576 codes a day makes same-day
collisions realistic, so the unique index is the guarantee and `createOrder()` retries.
Customer codes stay a plain `RLC-` sequence; they carry no date.

An order's `total` is computed from its line items in `createOrder()`, never accepted
from the client, so a stored total can't disagree with what it's made of. Line `name`
and `unitPrice` are snapshots too — a price rise must not rewrite last month's revenue.

`Product.stock` is the exception to the snapshot rule: it is *not* copied onto an
order line, because "how many are left" is only ever a question about now. It is
edited in place from the products table as an absolute count — staff count the shelf
and type what they see, so a delta would have to agree with a number nobody read. A
check constraint keeps it ≥ 0.

`createOrder()` takes the ordered units off the shelf in the same transaction that
writes the order, with one `UPDATE … SET stock = stock - n WHERE id = ? AND stock >= n`
per product so concurrent saves can't both subtract from the same starting number.

**Overselling is refused.** An order can't be saved for units that aren't on the
shelf. Three layers say so, and only the last one is the guarantee: the form disables
Save and marks the line, `parseOrderLines()` re-checks against live counts for a
readable message, and the `stock >= n` condition on the UPDATE decides it against the
locked row. Zero rows updated means someone else got there first, so the transaction
throws `OutOfStockError` and rolls the order back; the action turns that into a form
error rather than a crash. Stock is checked against the **total per product**, since
the same product can sit on two lines.

**An order is edited at `/user/order/[code]/edit`**, on the same `OrderForm` the create
route uses — one component, so there is no second layout for staff to learn. The route
supplies the action, the labels and the order's current values. What it may change is
the snapshot, the lines and the payment method; **not** the status (that moves from the
list, which records *when* it moved, and a form setting one would write a current status
the history never saw), not the code or the date, and not which customer the order is
for — `updateOrder()` takes `customerId` from the stored order, never the form. The name
stays editable because it is this order's own snapshot.

`updateOrder()` is the one place stock goes *back* on the shelf: it moves the
**difference** per product, so dropping a line typed as 10 instead of 1 returns the nine.
Cancelling an order still restores nothing. The units an edit already holds count as
available to it — otherwise a save that only fixed an address could be refused because
the product had since sold out — so `parseOrderLines()`, `stockShortfalls()` and the
picker's "N left" all take a `held` map. The picker subtracts what the form's own lines
have already claimed, which is why it reads "None left" (used up here) distinctly from
"Out of stock" (none on the shelf at all).

Two locks keep concurrent edits honest, and they guard different races. The order row is
taken `FOR UPDATE` at the top of the transaction, so two staff saving the same order
can't both measure their difference against the same starting lines. The per-product
`stock >= n` UPDATE then guards two *different* orders reaching for the same last unit.
Both `createOrder()` and `updateOrder()` walk their products **ascending by id** — an
order's line order is arbitrary, and two transactions taking the same rows in opposite
orders deadlock.

Storage is Postgres via Prisma. `lib/*-store.ts` are the only modules that touch it;
everything else goes through them. Run `npm run db:up` then `npm run db:migrate`.

**Before running any migration against production, read
`docs/production-migrations.md`.** Production is Prisma Postgres behind a connection
pooler, and it has two traps that cost real time on 2026-08-26: dropping a column in one
step breaks the deployed app (Prisma names every column in its `SELECT`, so schema
changes and deploys must be interleaved), and the pooler leaks Prisma's advisory lock so
the second migration of a session hangs. That file is the runbook — follow it rather
than improvising.

## Auth

**Accounts are rows in the `staff` table**, with a `role` of `staff` or `admin`. The
old shared `ADMIN_USERNAME` / `ADMIN_PASSWORD` env pair is gone; only `SESSION_SECRET`
remains. `name` is the display name (the only thing the sidebar footer shows — no username, no role); the username is what signs in. Usernames are stored trimmed and lowercased, so the unique index is the
case-insensitive match. Passwords are scrypt hashes from `lib/password.ts`
(`scrypt$<salt>$<hash>`) — never stored or logged in the clear. `active = false`
switches someone off without deleting them.

Each person changes their own name and password at `/user/settings` (the id comes from
the session, never the form). A password change re-issues the current browser's cookie;
every other cookie for that person dies on its next request via `pv`.

There is **no sign-up and no staff-management UI yet**. The only way to make an account
is `npm run admin:create` (prompts for name, username and password; or `ADMIN_NAME_INIT` / `ADMIN_USERNAME_INIT` / `ADMIN_PASSWORD_INIT`),
which creates the **first admin and refuses to run once any admin exists** — it can't
add a second admin, add `staff`, or reset a password. Creating `staff` accounts is meant
to happen in the UI, which is the next step. Today the role is recorded but not displayed,
and `requireAdmin()` exists, but nothing calls it: `staff` and `admin` can do
the same things. `OrderStatusEvent.changedBy` is still written empty even though the
session now knows who it is.

A wrong username, a wrong password and a deactivated account give the **same** message,
and the login always runs one scrypt verification (against `DUMMY_HASH` when the
username doesn't exist), so neither the text nor the timing says which part missed.

The session is a cookie holding `<payload>.<HMAC-SHA256>` from `lib/session.ts`, signed
with `SESSION_SECRET`. The payload is `{ sid, role, pv, exp }`: the staff id, the role
at sign-in, a fingerprint of the password hash, and the expiry. The expiry lives inside
the signed payload, not just in the cookie's Max-Age — Max-Age is a hint to a browser,
and a replayed cookie never expires.

The cookie only proves *we issued it*. `getCurrentStaff()` in `lib/auth.ts` re-reads the
row on every request and rejects the session when the person is gone, inactive, or `pv`
no longer matches the current password hash — so deactivating someone or changing their
password revokes their cookie immediately, not at expiry. The role used is the row's
current one, not the cookie's.

Two layers guard the app, and they are not redundant:

- `proxy.ts` (Next 16's rename of `middleware.ts` — the exported function must be
  called `proxy`) redirects `/user/*` to `/login` when the cookie doesn't verify, and
  bounces a signed-in browser off `/login`. It reads only the cookie, never the
  database: it runs on every matched request, prefetches included.
- `requireSession()` from `lib/auth.ts` runs at the top of **every** Server Action. A
  Server Action is an ordinary POST, so this is what refuses one that never navigated
  through the proxy. `searchCustomersAction` is the sharp case — it returns phone
  numbers and addresses. It checks the database, and clears a stale cookie before
  redirecting (a Server Action may delete cookies; a render may not).
- Because the proxy can't see the database, a cookie that verifies but belongs to a
  removed/deactivated person would loop `/user` → `/login` → `/user`. `app/user/layout.tsx`
  breaks it by redirecting to `/login/expired`, a route handler that deletes the cookie.

`?next=` always goes through `safeNextPath()`, which allows only paths inside `/user`.
`//evil.example` starts with `/` and would sail past a naive prefix test.

Login is throttled in memory, 8 attempts per 10 minutes per IP. It resets on deploy and
a forged `x-forwarded-for` gets a fresh bucket, so move it to Postgres if this ever
faces the open internet.

`/` only redirects. Everything real lives under `/user`.

## Conventions

- TypeScript everywhere; no `any` in committed code.
- Server Components by default. `"use client"` only where interactivity needs it —
  the style guide page is fully static and stays a Server Component.
- Server Actions for mutations; avoid client-side fetch waterfalls.
- Match the surrounding file's style. Comment only what isn't obvious from the code.
