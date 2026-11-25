# Roles: Admin and Staff — build plan

> **How to use this file.** Work one phase per session. Tell Claude Code:
> `Read docs/role.md and do Phase 1 only.`
> Do the phases in order. Each phase lists what to change, what must not be touched,
> the steps, and when it is done. At the end of a phase: stop, report what changed,
> what you tested and what you could not test, then tick the phase in **Progress**.
> Do not start the next phase in the same session.

## Progress

- [x] Phase 0 — Preparation
- [x] Phase 1 — Server permissions (who may do what)
- [x] Phase 2 — Database: order change log, "made by", soft delete
- [x] Phase 3 — Staff accounts page (admin)
- [x] Phase 4 — Move routes to `/office/admin` and `/office/staff`
- [x] Phase 5 — Staff screens and sidebar (open: inline "add new customer" on the order form needs a server change — see Phase 5)
- [x] Phase 6 — Full test as admin and as staff (open: inline add-customer, phone width)
- [ ] Phase 7 — "Push to main": update production schema (no data loss), then deploy

---

## 1. Background

RALLA has one user today, the shop owner (admin). She is adding **one staff member**
who writes orders for her. The app needs two roles with different rights, and every
change to an order must be logged with who made it and when.

What already exists (do not rebuild it):

- `Staff` table with `role` (`staff` | `admin`) and `active` — `prisma/schema.prisma`.
- Session cookie with password fingerprint — `lib/session.ts`, `lib/auth.ts`.
  Changing a password or turning an account off already signs that person out on
  other devices on their next click.
- `requireSession()` and `requireAdmin()` guards in `lib/auth.ts`.
  **`requireAdmin()` is not used anywhere yet.** Every action only checks "signed in".
- `getCurrentStaff()` reads the role fresh from the database on every request.
  The role inside the cookie is only a hint; never trust it for a real decision.
- `OrderStatusEvent.changedBy` exists but is always saved empty.
- There is **no delete-order feature** today. It is new work (Phase 2).
- `scripts/create-admin.ts` creates the first admin only and refuses once one exists.

## 2. Rules (decided by the owner)

| Area | Admin | Staff |
|---|---|---|
| Dashboard | ✓ | — |
| Products: list, price, stock left | ✓ | ✓ read only |
| Products: add, edit name/SKU/price/stock, turn on/off | ✓ | — |
| Orders: see all | ✓ | ✓ |
| Orders: add | ✓ | ✓ |
| Orders: edit items, quantity, customer, address, note, status | ✓ | ✓ |
| Orders: delete (soft delete) | ✓ | ✓ |
| Orders: see deleted orders, restore | ✓ | — |
| Order change log on the order page | ✓ | ✓ |
| Customers: list and detail | ✓ full screen | ✓ separate read-only screen |
| Customers: add new (while writing an order) | ✓ | ✓ |
| Customers: edit details, change avatar | ✓ | — |
| Staff accounts: create, reset password, turn off | ✓ | — |
| Own settings: name, password | ✓ | ✓ |
| Theme/reference page (`/office/admin/theme`) | ✓ | — |

More decisions:

- Staff see **prices** (sale price). Products have no cost/profit field, so nothing else to hide.
- Staff customer screen shows **name, phone, address, their orders**. It hides **total spent**.
- Orders stay **editable after delivery**. Every edit is logged.
- Changing quantities moves stock automatically (already how `updateOrder` works).
- Old orders (before this feature) show **"before tracking"** where no author is known.
- After login: **admin → dashboard**, **staff → New order**.
- Staff and admin order pages **look the same**; only buttons and rights differ.
- Old `/user/...` links **redirect** to `/office/admin/...`.
- The staff name is **not** printed on the invoice.
- Only **admin** sees deleted orders and can restore them.
- Low-stock warning for staff: **5 units or fewer** (one constant, easy to change).
- **Deleting an order puts no stock back**, the same as cancelling, and restoring
  takes none off (decided 2026-11-25, option B). Staff fix the shelf count by hand.
  This overrides the stock lines in Phase 2 and Phase 6 below.
- All work happens on a **new branch `feat/staff-role`**, never on `main`.

### Sidebar design (decided by the owner)

One sidebar, two groups. Today the group is labelled **"Operations"**; it becomes
**"Admin"**, and a second group **"Staff"** is added under it.

```
ADMIN                         (admin only)
  Dashboard                   /office/admin/dashboard
  Orders  (+ New order)       /office/admin/order
  Products                    /office/admin/product
  Customers                   /office/admin/customer
  Deleted orders              /office/admin/order/deleted
  Staff                       /office/admin/staff
STAFF                         (staff and admin)
  New order                   /office/staff/order/new
  Orders                      /office/staff/order
  Products                    /office/staff/product
  Customers                   /office/staff/customer
Account menu: Settings, theme toggle, Sign out   (both)
```

- **Admin sees both groups.** Clicking an item in the Staff group opens exactly the
  screen her staff sees, so she can check what the staff member can do.
- **Staff see only the Staff group.** The Admin group is not rendered at all for staff
  (decided on the server from the role, not hidden with CSS).
- The active highlight follows the full path: `/office/staff/order` lights up
  **Staff → Orders**, not **Admin → Orders**.
- Collapsed sidebar (icons only): a thin divider between the two groups, and tooltips
  say which group, e.g. "Staff · Orders".
- Same look as today's sidebar (berry theme, logo badge, existing components).

## 3. Rules for every phase

1. Read `AGENTS.md` and `CLAUDE.md` first. This is Next.js 16: check
   `node_modules/next/dist/docs/` before writing routing, proxy, redirect or
   Server Action code.
2. **The server decides, not the screen.** Every Server Action and every page that
   needs a role checks it on the server (`requireAdmin()` / `requireSession()`), as
   the first line, before reading the form or the database. Hiding a button is never
   the security.
3. The role always comes from `getCurrentStaff()` (database), never from the cookie
   or the form.
4. Never take a staff id or author name from the form. The author of every change is
   the signed-in person from the session.
5. Do not touch `.env`, `.env.example` secrets, `generated/`, or `components/ui/`
   (generated shadcn files) unless a phase says so.
6. Database: **only additive migrations** in this plan (new tables, new nullable
   columns). Never drop or rename a column. Read `docs/production-migrations.md`.
7. **Local database only during Phases 0–6.** All schema changes, migrations, seeds
   and test data go to the local Docker database. Before any `prisma` or `db:*`
   command, check that `DATABASE_URL` in `.env` points at `localhost` (print the host
   only, never the full URL). If it points anywhere else (`prisma.io`, any remote
   host), **stop and tell the owner**. Do not edit `.env` to fix it.
   Production is touched only in Phase 7, and only when the owner says
   **"push to main"**.
8. Keep the current look (berry theme, existing components). No redesign.
9. **Branch `feat/staff-role` only.** Before any change, check `git branch
   --show-current`. If it is not `feat/staff-role`, stop and tell the owner. Never
   change, commit or push `main`. No commits and no pushes at all unless the owner
   asks; the owner commits.
10. Run `npm run lint` and `npm run build` at the end of every phase. Both must pass.
11. If something in this file is wrong or impossible, stop and report it instead of
    guessing.

---

## Phase 0 — Preparation

**Goal:** a safe starting point and a local staff account to test with.

Steps:

0. **Create the branch.** From an up-to-date `main`, create and switch to
   `feat/staff-role` (`git switch -c feat/staff-role`). Do not reuse the old
   `staff-accounts` branch — it is an old branch already merged into `main`.
   Uncommitted files (including this `docs/role.md`) come along to the new branch;
   that is expected. Confirm with `git branch --show-current`.
1. Check that `git status` is understood. There are uncommitted UI changes from
   earlier work (logo, login, dashboard, invoice). Do not revert them. Report the
   list to the owner so they can commit before Phase 1 if they want.
2. `package.json` has `"db:backup": "./scripts/backup-db.sh"`, but
   `scripts/backup-db.sh` **does not exist**. Report it. Do not write it unless the
   owner asks. (Production backup is handled in Phase 7.)
3. Start the local database (`npm run db:up`) and confirm the app runs (`npm run dev`).
4. Create a **local** staff user for testing. No UI for this exists until Phase 3, so
   add a small dev-only script `scripts/create-staff.ts` (same style as
   `create-admin.ts`: asks name, username, hidden password; role `staff`). It must
   refuse to run when `DATABASE_URL` contains `prisma.io` (production). Add
   `"staff:create": "tsx scripts/create-staff.ts"` to `package.json`.
5. Sign in once as admin and once as staff locally. Today both can do everything —
   that is expected. Write down which pages you checked.

**Do not touch:** any file in `app/`, `lib/`, `prisma/schema.prisma`.

**Done when:** a local admin and a local staff account both sign in, lint and build pass.

---

## Phase 1 — Server permissions (who may do what)

**Goal:** the rules in section 2 are enforced on the server. Screens still look the
same for both roles (buttons may still show for staff; they just refuse). Routes stay
under `/user` for now — the move is Phase 4.

Why first: it is small, it is the real security, and every later phase builds on it.

### 1.1 One place for the rules

Create `lib/permissions.ts`:

- A list of named abilities, for example: `viewDashboard`, `manageProducts`,
  `manageCustomers`, `createCustomer`, `manageStaff`, `writeOrders`, `deleteOrders`,
  `viewDeletedOrders`, `restoreOrders`, `viewTheme`.
- A map role → abilities that matches the table in section 2.
- `can(staff, ability): boolean`.
- `homePathFor(role)`: admin → dashboard, staff → new order page. For now return
  `/user/dashboard` and `/user/order/new`; Phase 4 changes them to `/office/...`.

In `lib/auth.ts`:

- Add `requireAbility(ability)` built on `requireSession()`: if the person lacks the
  ability, `redirect(homePathFor(staff.role))`.
- Change `requireAdmin()` so a staff member is redirected to `homePathFor("staff")`,
  **not** to `AFTER_LOGIN` (the dashboard) — that would loop once the dashboard is
  admin-only.
- Replace the fixed `AFTER_LOGIN` use after sign-in with `homePathFor(role)`.
  Keep `safeNextPath()`, but if the `next` path is one the person may not open,
  fall back to their home.

### 1.2 Lock the Server Actions

Change the guard on the first line of each action:

| File | Action | Guard |
|---|---|---|
| `app/user/product/new/actions.ts` | `createProductAction` | admin (`manageProducts`) |
| `app/user/product/actions.ts` | `toggleProductActiveAction` | admin |
| `app/user/product/actions.ts` | `setProductSkuAction` | admin |
| `app/user/product/actions.ts` | `setProductNameAction` | admin |
| `app/user/product/actions.ts` | `setProductStockAction` | admin |
| `app/user/product/actions.ts` | `setProductPriceAction` | admin |
| `app/user/customer/[slug]/actions.ts` | `updateCustomerAction` | admin (`manageCustomers`) |
| `app/user/customer/[slug]/actions.ts` | `updateCustomerAvatarAction` | admin |
| `app/user/customer/new/actions.ts` | `createCustomerAction` | both (`createCustomer`) |
| `app/user/order/new/actions.ts` | `createOrderAction` | both |
| `app/user/order/[slug]/edit/actions.ts` | `updateOrderAction` | both |
| `app/user/order/actions.ts` | `updateOrderStatusAction` | both |
| `app/user/order/actions.ts` | `updateOrderNoteAction` | both |
| `app/user/order/actions.ts` | `searchCustomersAction` | both |
| `app/user/settings/actions.ts` | both actions | both (own account only — already true) |

### 1.3 Lock the pages

Add a server-side check at the top of these pages (redirect staff to their home):

- `app/user/dashboard/page.tsx` — admin only.
- `app/user/product/new/page.tsx` — admin only.
- `app/user/theme/page.tsx` — admin only.
- `app/user/page.tsx` and `app/page.tsx` — redirect to `homePathFor(role)` instead of
  always the dashboard.

Leave the product list, customer list, customer detail and order pages open to both
for now. Their staff versions come in Phase 5.

### 1.4 Sidebar (small, temporary)

In `app/user/_components/user-sidebar.tsx`:

- Rename the group label **"Operations"** to **"Admin"**.
- Hide the **Dashboard** link for staff (pass the role from `app/user/layout.tsx`).

Nothing else in the sidebar changes in this phase. The **Staff** group is added in
Phase 4, when the `/office/staff` pages exist.

**Do not touch:** `prisma/`, `lib/*-store.ts`, `lib/session.ts`, `proxy.ts`, page
layouts and styling, `components/ui/`.

**Done when:**

- Signed in as staff: the dashboard and Add product pages redirect to New order;
  saving a product edit or a customer edit is refused; adding an order, editing an
  order, changing status and note, and adding a customer all work.
- Signed in as admin: everything works exactly as before.
- After login: admin lands on the dashboard, staff on New order.
- A staff session calling an admin Server Action directly (not through the button)
  is refused. Test at least `setProductPriceAction` this way.
- `npm run lint` and `npm run build` pass.

---

## Phase 2 — Database: order change log, "made by", soft delete

**Goal:** every order change is recorded with who and when; orders can be deleted
softly and restored by admin.

### 2.1 Schema (one additive migration)

In `prisma/schema.prisma`:

- `Order`: add `createdById Int?` (→ `Staff`, `onDelete: SetNull`),
  `deletedAt DateTime?`, `deletedById Int?` (→ `Staff`, `SetNull`). Index `deletedAt`.
- New model `OrderChange` (table `order_changes`):
  - `id`, `orderId` (→ `Order`, `onDelete: Cascade`)
  - `staffId Int?` (→ `Staff`, `SetNull`) and `staffName String` — a snapshot of the
    name, so the log stays readable if the account is renamed or removed
  - `action` enum: `created`, `updated`, `status`, `note`, `deleted`, `restored`
  - `field String @default("")` — e.g. `quantity`, `address`, `items`
  - `oldValue String @default("")`, `newValue String @default("")`
  - `changedAt DateTime @default(now())`
  - index `[orderId, changedAt]`
- `Staff`: add the back-relations Prisma needs.
- Keep `OrderStatusEvent` as it is; from now on fill `changedBy` with the staff name.

Migrate locally only: `npm run db:migrate` (see rule 7; after it applies, Ctrl+C is
safe, then `npx prisma generate`).

### 2.2 Store functions (`lib/order-store.ts`)

- Every write function takes an `actor: { id: number; name: string }` argument:
  `createOrder`, `updateOrder`, `updateOrderNote`, `updateOrderStatus`.
- Write the `OrderChange` rows **inside the same transaction** as the change.
- `createOrder`: set `createdById`; one `created` row.
- `updateOrder`: compare old vs new and write one row per changed field (customer,
  phone, city, address, payment method, SMS flag, note, each item line added /
  removed / quantity changed). Keep values short and human-readable, e.g.
  `"Lip tint × 2" → "Lip tint × 3"`.
- `updateOrderStatus`: one `status` row; also fill `OrderStatusEvent.changedBy`.
- `updateOrderNote`: one `note` row.
- New `softDeleteOrder(id, actor)`: set `deletedAt`, `deletedById`; put the order's
  units back on the shelf (they were never sold); one `deleted` row.
  Report to the owner how a **cancelled** status treats stock today, and make delete
  consistent with it — do not change cancel behaviour.
- New `restoreOrder(id, actor)`: clear `deletedAt`; take the units off the shelf
  again; if stock is short, refuse with the existing `OutOfStockError`; one
  `restored` row.
- New `listOrderChanges(orderId)`.
- **Every read that lists or counts orders must skip deleted ones**: `listOrders`,
  `listOrdersPage`, `countOrdersByStatus`, `listOrdersByCustomer`, `revenueByDay`,
  `salesOnDay`, `topProductsByUnits`, `ordersByCity`, `getOrderBySlug` (return null
  for deleted unless an `includeDeleted` flag is passed). New
  `listDeletedOrders()` for admin.

### 2.3 Server Actions

- Pass the signed-in staff (from `requireSession()`) as `actor` in
  `createOrderAction`, `updateOrderAction`, `updateOrderStatusAction`,
  `updateOrderNoteAction`. Remove the old "changedBy is still left empty" note.
- New `deleteOrderAction` (both roles) and `restoreOrderAction` (admin only).

### 2.4 Minimal UI so it can be tested

- Order detail page (`app/user/order/[slug]/page.tsx`): a **History** section listing
  changes, newest first: name, date/time (Yangon time), what changed. Orders with no
  rows show "Before tracking".
- A **Delete order** button with a confirm step on the order page.
- A simple admin-only **Deleted orders** list with **Restore**. Plain styling is fine;
  Frontend Designer polishes it in Phase 5.

**Do not touch:** `lib/session.ts`, `lib/auth.ts` (except importing), product and
customer actions, `proxy.ts`, styling beyond the minimal new sections.

**Done when:**

- Editing an order as staff and as admin creates history rows with the right name.
- Old orders show "Before tracking".
- Deleting removes the order from lists, counts, dashboard numbers and the customer's
  orders, and returns stock. Restore brings it back and takes stock again.
- Staff cannot restore (direct call refused) and cannot see the deleted list.
- Migration file contains only `CREATE TABLE`, `ADD COLUMN`, `CREATE INDEX`,
  foreign keys — no `DROP`, no `ALTER ... NOT NULL` on existing columns.
- Lint and build pass.

---

## Phase 3 — Staff accounts page (admin)

**Goal:** the owner manages staff logins herself, without scripts.

- `lib/staff-store.ts`: add `listStaff()`, `createStaff({ name, username, password,
  role })` (hash with `lib/password.ts`, username via `normalizeUsername`),
  `setStaffActive(id, active)`, `resetStaffPassword(id, newHash)`, `setStaffRole(id, role)`.
- New page `app/user/staff/page.tsx` (+ actions), admin only (`manageStaff`):
  - list: name, username, role, active;
  - add staff: name, username, password (min length from `lib/password.ts`),
    role defaults to `staff`;
  - reset password (admin types a new one; that person is signed out everywhere);
  - turn account off / on (signed out on next click — already works).
- Safety rules (server side):
  - an admin cannot turn off or demote **themself**;
  - the **last active admin** can never be turned off or demoted;
  - duplicate username → friendly error.
- Add **Staff** to the admin sidebar.
- After this phase, `scripts/create-staff.ts` from Phase 0 can stay as a dev tool.

**Do not touch:** `lib/session.ts`, `prisma/schema.prisma` (no schema change needed).

**Done when:** admin can create a staff login, the staff member can sign in, reset and
turn-off work and sign the person out, the safety rules hold, staff get redirected away
from the page and its actions. Lint and build pass.

---

## Phase 4 — Move routes to `/office/admin` and `/office/staff`

**Goal:** two separate sections. Staff never see or open the admin section. Admin can
open both.

> **As built (owner's choice, 2026-11-25): one folder, two addresses.** The URLs are
> exactly as below, but the files are **not** split into `admin/`, `staff/` and
> `_shared/`. Every page lives once in `app/office/[section]/`, where `[section]` is
> `admin` or `staff`; `getSection()` / `useSection()` give the link prefix, and
> admin-only pages call `adminSectionOnly()`. See "Sections" in `CLAUDE.md`. The
> structure in 4.1 is kept below as the original plan.

### 4.1 Target structure (original plan — superseded, see note above)

```
app/office/
  layout.tsx            # session check only (no sidebar)
  _shared/              # components and actions used by both sections
  admin/
    layout.tsx          # requireAdmin() + admin sidebar
    dashboard/  order/  product/  customer/  staff/  settings/  theme/
  staff/
    layout.tsx          # requireSession() (admin allowed too) + staff sidebar
    order/  product/  customer/  settings/
```

- Move today's `app/user/*` to `app/office/admin/*`.
- Move pieces both sections use (order form, order lines, order cards, status select,
  search, pager, parse helpers, invoice download, order-return, breadcrumb,
  scroll-header) into `app/office/_shared/` so they exist **once**. Do not copy-paste
  them into the staff folder.
- Server Actions shared by both roles live once (in `_shared/` or `lib/`), still with
  their role guard inside. Never rely on the folder for security.

### 4.2 Paths

- `lib/permissions.ts` → `homePathFor`: admin `/office/admin/dashboard`,
  staff `/office/staff/order/new`.
- `lib/auth.ts` → `safeNextPath()` allows `/office/...`; a staff member's `next`
  pointing into `/office/admin` falls back to their home.
- Update every hard-coded `/user` path: links, `redirect()`, `revalidatePath()`,
  `orders-href.ts`, `products-href.ts`, the sidebar, breadcrumbs. About 38 files /
  ~120 places mention `/user` today. Search for `"/user`, `'/user` and `` `/user ``
  and leave **zero** behind (except the redirect in 4.3).
- Admin and staff order pages must link inside their own section (an order opened
  from `/office/staff/order` goes to `/office/staff/order/[slug]`).

### 4.3 Proxy and redirects

- `proxy.ts`: matcher covers `/office`, `/office/:path*`, `/login` and the old `/user`
  paths. Signed-out → login (keep `next`). Optimistic role check from the cookie: a
  staff cookie on `/office/admin/...` → `/office/staff/order/new`. The layouts and
  actions still do the real check.
- `/user/...` → `/office/admin/...` (same rest of the path, temporary redirect, not
  permanent, so it can be changed later). Staff hitting an old link then land in their
  section through the role check.
- `app/page.tsx` and `/office` → `homePathFor(role)`.
- `app/login/expired/route.ts` keeps working.

### 4.4 Admin can see both

Build the two-group sidebar from **"Sidebar design"** in section 2:

- One sidebar component (moved to `app/office/_shared/`), used by both layouts.
  The server passes the role; the **Admin** group is rendered only for admins, the
  **Staff** group for everyone.
- Admin group links go to `/office/admin/...`, Staff group links to
  `/office/staff/...`. The active highlight uses the full path.
- An admin on a staff page keeps seeing both groups, so she can go back with one click.
- No separate "Staff view" / "Back to admin" links; the groups replace them.
- In this phase the Staff group links may open pages that still look like admin pages;
  their staff versions come in Phase 5.

**Do not touch:** `prisma/`, `lib/*-store.ts` logic, the look of any page.

**Done when:**

- Every page works at its new address for admin; `/user/...` bookmarks redirect.
- Staff opening any `/office/admin/...` address lands on their home.
- Admin can open both sections.
- No `/user` string left except the redirect. Lint and build pass.
- `app/user/` folder is gone.

---

## Phase 5 — Staff screens and sidebar (UI)

**Goal:** staff see a clean, simple section with only what they need.
This phase is UI only (Frontend Designer can do it). If a screen seems to need a
server change, stop and report.

Sidebar: as in **"Sidebar design"** (section 2). Polish the two group labels, the
divider and tooltips in the collapsed state. Staff group order: **New order**,
**Orders**, **Products**, **Customers**; **Settings** in the account menu. Staff never
see the dashboard, staff page, deleted orders or theme page.

Screens (the `section === "staff"` side of the pages in `app/office/[section]/` — see
the Phase 4 note; put a staff-only screen in its own component and choose it there):

1. **New order** — same form as admin. Includes "add new customer" inline.
   **Not built (2026-11-25):** the form has no inline add today (an unknown customer is
   typed in as a walk-in), and `createCustomerAction` redirects on success, so adding one
   from inside the order form needs an action that returns the new customer instead.
   That is a server change, so it waits for the owner's go-ahead.
2. **Orders** — same list, cards/table, filters and status changes as admin.
   No deleted-orders view.
3. **Order detail / edit** — same as admin, with **History** and **Delete order**.
   No restore.
4. **Products** — read only: photo (if any), name, SKU, **price**, **stock left**.
   Stock of 5 or less is marked clearly (e.g. "Low · 3 left"); 0 shows "Out of stock".
   No edit sheet, no Add product, no on/off switch. Search stays.
5. **Customers** — list + detail, read only: name, phone, address, their orders.
   **No total spent**, no edit card, no avatar picker.
6. **Settings** — same as admin (own name and password).

Admin polish in this phase:

- **Deleted orders** page (from Phase 2) styled to match Orders, with Restore.
- **Staff** page (from Phase 3) styled to match the app.
- History section on the order page styled as a clean timeline.

**Do not touch:** any `actions.ts`, `lib/`, `prisma/`, `proxy.ts`, `lib/auth.ts`,
`lib/permissions.ts`.

**Done when:** both sections look consistent with the current app on desktop and
phone width, staff never see an edit control they cannot use, lint and build pass.

---

## Phase 6 — Full test as admin and as staff

Run locally with one admin and one staff account. Record pass/fail for each line.

> **Run 2026-11-25** against the local dev server, signing in through the real form as
> `admin` and `staff`. Every test row was removed afterwards and stock put back. Two lines
> stay open: inline add-customer (not built) and phone width (needs a browser).

Staff:

- [x] Login lands on New order.
- [x] Sidebar shows only the **Staff** group (New order, Orders, Products, Customers)
      and Settings. No **Admin** group, not even in the page source.
- [x] Every `/office/admin/...` address redirects to staff home (try dashboard,
      product, staff, theme, a customer, an order).
- [x] Add order works; stock goes down.
- [x] Edit order (quantity up and down) works; stock follows; History shows the
      staff name.
- [x] Status and note change logged with the staff name.
- [x] Delete order: gone from lists and counts; stock **unchanged** (decision B).
- [x] Products: price and stock visible, low-stock mark correct, no edit possible.
- [x] Customers: read only, no total spent.
- [ ] Add a new customer while writing an order works. **Not built** — see Phase 5;
      today the order saves the typed details as a walk-in, and Customers → New works.
- [x] Direct calls to admin actions are refused: product price/stock/name/SKU/on-off,
      create product, customer edit/avatar, restore order, all staff-page actions.
- [x] Changing own password signs out the other device.

Admin:

- [x] Login lands on dashboard; dashboard numbers ignore deleted orders.
- [x] Everything that worked before still works. (Every admin page loads; edits checked.)
- [x] Sidebar shows both groups, **Admin** and **Staff**. Clicking each Staff item
      opens the same screen staff see; the right item is highlighted; Admin items
      still one click away.
- [x] Deleted orders list and Restore work; stock unchanged on restore (decision B).
- [x] Staff page: create, reset password, turn off/on; cannot turn off self or last admin.
- [x] Old `/user/...` bookmark redirects correctly.
- [x] Invoice prints without staff name.

General:

- [ ] Phone width for staff screens. **Not checked** — needs a browser; the owner checks.
- [x] `npm run lint` and `npm run build` pass.

---

## Phase 7 — "Push to main": production schema first, then deploy

**Start this phase only when the owner says "push to main".** Never on your own.

**The goal:** production's database gets the new schema **without losing or changing
any existing row**. Then the code goes to `main` and Vercel deploys it. The schema goes
first because the new code needs the new tables and columns. All migrations in this
plan only add things, so the old live code keeps working in between.

### Never run against production

- `prisma migrate dev`, `prisma migrate reset`, `prisma db push`, `npm run db:seed`
  (seed starts with `deleteMany()` on every table), `npm run db:migrate`, `db:reset`.
- Any flag `--accept-data-loss` or `--force-reset`.
- Any hand-written `DROP`, `TRUNCATE`, `DELETE`, `UPDATE` on production data.

The only command that writes to production is `prisma migrate deploy`.

### 7.1 Pre-flight (local, no production access yet)

1. All of Phases 0–6 are ticked; `npm run lint` and `npm run build` pass.
2. `git status` is clean apart from this work; report what will be committed.
3. List every migration folder in `prisma/migrations/` that production does not have
   yet (newer than `20261120000000_add_slugs`, unless the owner says otherwise).
4. **Read every `migration.sql` in that list.** Allowed: `CREATE TABLE`, `CREATE TYPE`,
   `ADD COLUMN` (nullable or with a default), `CREATE INDEX`, `ADD CONSTRAINT ...
   FOREIGN KEY`. **If any file contains `DROP`, `TRUNCATE`, `DELETE`, `RENAME`,
   `ALTER COLUMN ... TYPE`, or `SET NOT NULL` on an existing column, stop and report.**
   Show the owner the full SQL of each new migration.
5. Prove the whole chain replays from empty on a scratch database (see
   `docs/production-migrations.md`, the `ralla_check` example), then drop the scratch
   database.

### 7.2 Back up production (owner)

6. The owner takes a backup of production (Prisma Console backup, or `pg_dump` over
   the direct, non-pooled connection). Note: `npm run db:backup` points to
   `scripts/backup-db.sh`, which does not exist. Do not continue until the owner
   confirms the backup exists.

### 7.3 Update the production schema

7. Get the production connection string from the owner for this step only. Pass it
   on the command line for each command (`DATABASE_URL="..." npx prisma ...`).
   **Do not write it into `.env`**, do not print it, do not save it anywhere.
8. Read-only check first: `npx prisma migrate status` against production. Read the
   host it shows and the list of pending migrations. They must be exactly the list
   from step 3. If not, stop.
9. Record production row counts (read-only `SELECT count(*)`): `customers`,
   `orders`, `order_items`, `products`, `order_status_events`, `staff`.
10. Apply: `npx prisma migrate deploy` against production. If it hangs on the
    advisory lock (pooled URL), use the workaround in `docs/production-migrations.md`
    (`PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true`), only when nobody else is migrating.
11. Verify: `migrate status` says up to date; the same row counts as step 9 (nothing
    lost); the new tables exist and are empty; one existing order can be read.
12. Make sure `.env` still points at `localhost`. Run `npx prisma generate`.

### 7.4 Push and deploy

13. Commit on `feat/staff-role` (the owner writes or approves the message), push the
    branch, then merge `feat/staff-role` into `main` and push `main`. Vercel
    builds with `prisma generate && next build` — it does **not** run migrations, which
    is why 7.3 comes first.
14. Wait for the deploy to finish, then load a real page on `www.rallapos.com`.

### 7.5 After deploy (owner)

15. Sign in as admin: check the dashboard, an old order's History ("Before
    tracking"), the Staff page.
16. Create the real staff account on the Staff page; give the username and password to
    the staff member privately.
17. Staff signs in on their device and writes one test order; admin checks History,
    then deletes the test order.
18. Update `CLAUDE.md` (it still says "admin-only web app" and lists `app/user/`) to
    describe the two roles and the `/office` layout.

**If anything fails in 7.3:** stop, do not push, report the exact error. Because the
migrations only add things, the live site keeps working on the old code meanwhile.
