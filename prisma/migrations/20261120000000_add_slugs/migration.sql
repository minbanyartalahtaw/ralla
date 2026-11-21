-- Random URL slugs for orders and customers, so a detail URL can't be guessed
-- from a code. Additive only: nothing is dropped or rewritten.
--
-- gen_random_uuid() is volatile, so ADD COLUMN evaluates the default once per
-- existing row — this is the backfill. It is also why production needs no
-- interleaving: the old deployed app inserts without naming `slug` and still
-- gets one. Migrate first, then deploy.

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "slug" TEXT NOT NULL DEFAULT left(replace((gen_random_uuid())::text, '-'::text, ''::text), 16);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "slug" TEXT NOT NULL DEFAULT left(replace((gen_random_uuid())::text, '-'::text, ''::text), 16);

-- CreateIndex
CREATE UNIQUE INDEX "customers_slug_key" ON "customers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "orders_slug_key" ON "orders"("slug");
