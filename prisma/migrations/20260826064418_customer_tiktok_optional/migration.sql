-- Step 1 of 2 in removing the TikTok handle from customers.
--
-- Only makes the two columns nullable; nothing is read or deleted yet. This
-- has to ship BEFORE the release that stops writing them, because
-- `tiktok_username` is NOT NULL with no default: the moment the new code
-- INSERTs a customer without it, every "Add customer" save would fail.
--
-- Both statements are catalog-only in Postgres — no table rewrite, no scan.
-- The drop itself is 20260826_drop_customer_tiktok, run after the new code
-- is live everywhere.

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "code" SET DEFAULT ('RLC-' || nextval('customer_code_seq')),
ALTER COLUMN "tiktok_username" DROP NOT NULL,
ALTER COLUMN "tiktok_name" DROP NOT NULL;
