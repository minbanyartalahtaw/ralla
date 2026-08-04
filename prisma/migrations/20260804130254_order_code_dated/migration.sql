-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "code" SET DEFAULT ('RLC-' || nextval('customer_code_seq'));

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "code" DROP DEFAULT;

-- Order codes now carry the order date, so the sequence that fed the old
-- `RL-<n>` format is no longer used.
DROP SEQUENCE IF EXISTS "order_code_seq";

-- Rewrite any existing order to the new shape, deriving the date part from the
-- order's own placed_at in Yangon time so the code still describes the order.
-- Random suffixes could in principle collide; the unique index would abort the
-- migration, and re-running it would pick different letters.
UPDATE "orders"
SET "code" = 'RL-'
  || to_char("placed_at" AT TIME ZONE 'Asia/Yangon', 'YYMMDD')
  || chr(65 + floor(random() * 26)::int)
  || chr(65 + floor(random() * 26)::int)
  || chr(65 + floor(random() * 26)::int)
WHERE "code" !~ '^RL-[0-9]{6}[A-Z]{3}$';
