-- Step 2 of 2 in removing the TikTok handle from customers.
--
-- DESTRUCTIVE AND IRREVERSIBLE: the handles are not copied anywhere first.
-- Take a dump before running this in production.
--
-- Safe to run only once the release that stopped reading these columns is
-- live on every instance. Until then an older instance still SELECTs
-- tiktok_username by name and every customer query would fail. Step 1
-- (customer_tiktok_optional) is what makes that overlap survivable in the
-- other direction — new code can INSERT without the column while it is
-- still there.
--
-- DROP COLUMN is catalog-only in Postgres: no table rewrite, no scan. The
-- unique index on tiktok_username goes with the column.

-- DropIndex
DROP INDEX IF EXISTS "customers_tiktok_username_key";

-- AlterTable
ALTER TABLE "customers"
  DROP COLUMN "tiktok_username",
  DROP COLUMN "tiktok_name";
