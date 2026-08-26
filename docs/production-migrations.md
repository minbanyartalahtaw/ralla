# Running a migration against production

Written 2026-08-26, after removing `Customer.tiktokUsername` and `tiktokName`. That
change is the worked example throughout — it is the first migration this project ran
against real data, and everything below is something it actually hit.

Production is **Prisma Postgres** (`pooled.db.prisma.io`). Local is the Docker Postgres
from `docker-compose.yml`. Both are driven by the same `DATABASE_URL` in `.env`, which
is the root of several hazards here.

---

## The rule: never drop a column in one step

Prisma names every column in its `SELECT`. It does not `SELECT *`. So a column that
exists in the deployed client's schema **must** exist in the database, and a column the
database requires **must** be supplied by the deployed client. Dropping a column and
shipping the code that stops using it are therefore two separate events, and doing them
in one step breaks in whichever direction you pick:

| Order | What breaks |
|---|---|
| Drop the column first | Deployed code still runs `SELECT tiktok_username` → every customer page fails with `P2022` |
| Deploy the code first | New code `INSERT`s without `tiktok_username`, which is `NOT NULL` with no default → "Add customer" fails |

Split it into three moves and neither window exists:

1. **Migration A — make it optional.** `ALTER COLUMN … DROP NOT NULL`. Deploy nothing.
   Old code is unaffected; new code becomes *able* to run. Non-destructive.
2. **Deploy the code** that stops reading and writing the column. Both schemas work
   during the rollout.
3. **Migration B — drop it.** `DROP COLUMN`. Only once step 2 is live everywhere.

Both statements are catalog-only in Postgres — no table rewrite, no scan, no meaningful
lock even on a large table. The cost of splitting is one extra file.

See `prisma/migrations/20260826064418_customer_tiktok_optional/` and
`20260826065210_drop_customer_tiktok/` for the pair.

---

## The pooler eats the migration lock

**This is the one that will bite you again.**

`prisma migrate deploy` takes `pg_advisory_lock(72707369)` before it runs. Advisory
locks are **session**-scoped. `pooled.db.prisma.io` is a connection pooler: it hands
backend sessions out and takes them back for reuse. The lock from one migration is
never released, and the next migration blocks on it forever:

```
Timed out trying to acquire a postgres advisory lock
(SELECT pg_advisory_lock(72707369)). Timeout: 10000ms.
```

On 2026-08-26 migration A succeeded (it got there first) and migration B hung. A
plain read-only query issued afterwards showed up *holding* the lock, which is how the
leak was confirmed — the pooled backend it landed on was the one that had run
migration A.

**The workaround used:**

```bash
PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true npx prisma migrate deploy
```

Safe here only because there is exactly one operator and `npm run build` is
`prisma generate && next build` — nothing else runs migrations concurrently. It is not
safe if a CI job or a second person might migrate at the same time.

**The actual fix, still not done:** get the direct, unpooled connection string from the
Prisma Console, put it in `.env` as `DIRECT_URL`, and point `prisma.config.ts`'s
`datasource.url` at it for migrations. The pooled URL is for the *app*; migrations want
a real session. Until that exists, every future migration hits this.

---

## `migrate deploy` applies everything pending

There is no "apply one migration" flag. `npx prisma migrate deploy` runs **all**
pending migrations, which silently collapses the three-step plan back into the unsafe
one-step version if you commit both migrations and deploy once.

To apply only migration A, move the other one out of the tree, deploy, then put it
back:

```bash
mv prisma/migrations/2026…_drop_customer_tiktok /tmp/held/
npx prisma migrate deploy            # applies only the nullable migration
mv /tmp/held/2026…_drop_customer_tiktok prisma/migrations/
```

Committing the two migrations in two separate releases is the less error-prone version
of the same idea.

---

## Prisma refuses destructive migrations non-interactively

`prisma migrate dev --create-only` aborts with *"You are about to drop the column …
which still contains N non-null values"* when it cannot prompt. Do not try to force it
— hand-write the migration directory instead. It is better anyway: the SQL gets
reviewed, and no server ever waits on a prompt.

```bash
DIR="prisma/migrations/$(date -u +%Y%m%d%H%M%S)_drop_customer_tiktok"
mkdir -p "$DIR" && $EDITOR "$DIR/migration.sql"
```

Prisma also blocks `migrate reset` outright when it detects an AI agent driving it, and
that block is correct — `reset` destroys every row. To prove a migration chain replays
from empty without touching a database anyone cares about, build a scratch one
alongside it:

```bash
docker exec ralla-db psql -U ralla -d postgres -c "CREATE DATABASE ralla_check;"
DATABASE_URL="postgresql://ralla:ralla_dev_only@localhost:5432/ralla_check?schema=public" \
  npx prisma migrate deploy
docker exec ralla-db psql -U ralla -d postgres -c "DROP DATABASE ralla_check;"
```

---

## `.env` pointed at production is loaded gun

While `DATABASE_URL` points at `pooled.db.prisma.io`, **`npm run db:seed` deletes all
production data.** `prisma/seed.ts` opens with `deleteMany()` on every table, in FK
order. `db:migrate` and `db:studio` are aimed at production too.

Point `.env` back at localhost the moment the production work is finished. Keep the
production line in the file, commented, so re-pointing is a one-character edit.

---

## The procedure, end to end

```bash
# 0. Back up whatever the migration destroys. This is the only copy.
#    A small script through Prisma's $queryRawUnsafe is enough for a column or two.

# 1. Point .env at production, confirm the target before anything else.
npx prisma migrate status          # shows the resolved host — read it

# 2. Apply the non-destructive migration only (hold the rest back, see above).
npx prisma migrate deploy

# 3. Commit and push. Let the deploy finish. Load a real page on the live site —
#    the dashboard saying "ready" is not the same as the code serving.

# 4. Apply the destructive migration.
PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true npx prisma migrate deploy

# 5. Verify with the app's own code, not just the schema — call listCustomers(),
#    getCustomer(), searchCustomers() against production and read the results.
#    Compare row counts against what you recorded in step 1.

# 6. Point .env back at localhost. Run `npx prisma generate`.
```

Record row counts **before** you start. On 2026-08-26 they were 21 customers, 20
orders, 55 products, 40 order items, 57 status events — unchanged afterwards, which is
what made "nothing was deleted" a fact rather than a hope.

---

## A stale error overlay is not a bug

A `dev` server holds the generated Prisma client in memory. After `prisma generate`
changes the schema, the running server and any error overlay already on screen are from
the old client. `The column customers.tiktok_username does not exist in the current
database` in the browser, when `grep -r tiktok generated/prisma/` returns nothing, means
restart `npm run dev` and reload — not that the code is wrong.

It is worth noticing that this is the *same* failure as dropping a column before
deploying. The dev server is a rehearsal of the production hazard.