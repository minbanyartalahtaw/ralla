# RALLA

Internal admin for RALLA, a cosmetics store. Staff use it to record **orders**,
**customers** and **products**, and to move each order through its **delivery
status**.

There is no customer-facing side. `/` redirects to `/user/dashboard`, and
everything under `/user` needs a session — so the whole app is the admin.

## Stack

| | |
|---|---|
| Framework | Next.js 16.3 (App Router, Turbopack) |
| UI | React 19.2 — Server Components by default |
| Styling | Tailwind CSS v4, configured in CSS (`app/globals.css`), not a JS config |
| Components | shadcn (`base-mira`, built on Base UI) in `components/ui/` |
| Icons | hugeicons |
| Database | Postgres via Prisma 7 |
| Language | TypeScript, strict |

> **Next.js 16 is not the Next.js most references describe.** `middleware.ts` is
> now `proxy.ts`, among other changes. The docs that ship with the installed
> version are in `node_modules/next/dist/docs/` — read those before writing
> routing, data-fetching or caching code. See `AGENTS.md`.

## Getting started

Needs Node 20+ and Docker (for the local database).

```bash
npm install
cp .env.example .env      # the defaults match docker-compose.yml
npm run db:up             # start Postgres
npm run db:migrate        # apply migrations
npm run db:seed           # load the development fixtures
npm run admin:create            # make the first admin (prompts for a password)
npm run dev
```

Then open <http://localhost:3000> and sign in with the account you just made.

> `npm run db:migrate` applies the migrations and then keeps running instead of
> exiting. Ctrl+C once it says it is done is safe — follow it with
> `npx prisma generate`.

### Environment

Every variable is documented in `.env.example`. The three that matter:

- `DATABASE_URL` — Postgres connection string.
- `SESSION_SECRET` — signs the session cookie. Generate with `openssl rand -base64 32`.
- `GEMINI_API_KEY` — optional; powers the assistant sheet.

Changing `SESSION_SECRET` signs everyone out. Accounts live in the `staff` table
(roles `staff` and `admin`). `npm run admin:create` makes the first
admin and refuses to run once one exists; other accounts are meant to be created
in the app. Changing a password, or setting `active = false`, ends that person's
sessions on their next request.

## Commands

```bash
npm run dev      # dev server
npm run build    # prisma generate && next build
npm run start    # serve the production build
npm run lint     # eslint

npm run db:up      # start Postgres in Docker
npm run db:down    # stop it
npm run db:reset   # drop the volume and start clean
npm run db:migrate # apply migrations
npm run db:seed    # reset to the development fixtures
npm run db:studio  # browse the data
```

There is no test runner yet.

## Layout

```
app/
  page.tsx        redirect only — there is no landing page
  globals.css     every theme token, plus the contrast notes
  login/          the sign-in form; the one route outside /user
  user/           the admin app
    dashboard/ order/ customer/ product/
    theme/        style guide — deliberately unlinked, reachable only by URL
components/ui/    shadcn components (generated — regenerate, don't hand-write)
lib/              domain logic + *-store.ts, the only modules that touch the database
prisma/           schema, migrations, seed
docs/             runbooks
```

Route-specific components live in their route folder; they move to a shared
directory only once a second route needs them.

## A few things worth knowing

- **Money is an integer count of kyats**, never a float.
- **An order copies the customer's details** rather than joining to them, so
  moving house can't rewrite where last year's orders were delivered.
- **Order codes** are `RL-260804TXI` — `RL`, the Yangon date, three random
  letters. Same-day collisions are realistic, so the unique index is the
  guarantee and `createOrder()` retries.
- **Detail URLs address records by `code`**, not `id` — `/user/customer/RLC-1015`
  is the row staff are already looking at.
- **Overselling is refused** at three layers, and only the last one — a
  `stock >= n` condition on the UPDATE — is the actual guarantee.
- **Auth is per-person accounts** in the `staff` table, role `staff` or `admin`.
  The role is recorded but nothing is gated by it yet.

`CLAUDE.md` has the full version of all of this, including the theme rules and
why each decision went the way it did. **Before running a migration against
production, read [`docs/production-migrations.md`](docs/production-migrations.md)** —
the connection pooler and Prisma's column-by-column `SELECT` each have a trap in
them that the runbook walks around.
