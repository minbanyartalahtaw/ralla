-- Snapshots the catalog SKU onto every order line.
--
-- Additive and defaulted, so it is safe in one step and in either order with a
-- deploy: old code never SELECTs a column it doesn't know about, and new code
-- INSERTing without it gets ''. That is the opposite of the TikTok drop — see
-- docs/production-migrations.md for why that one needed three moves.
--
-- The backfill reads today's catalog, which is the only SKU history there is.
-- A line whose product has since been deleted (product_id IS NULL) keeps '',
-- and the UI shows a dash rather than inventing one.
--
-- The customers DEFAULT below is Prisma restating a dbgenerated expression it
-- can't introspect. It is identical to the existing default and does nothing.

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "code" SET DEFAULT ('RLC-' || nextval('customer_code_seq'));

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "sku" TEXT NOT NULL DEFAULT '';

-- Backfill from the catalog.
UPDATE "order_items" oi
SET "sku" = p."sku"
FROM "products" p
WHERE p."id" = oi."product_id";
