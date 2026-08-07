-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "code" SET DEFAULT ('RLC-' || nextval('customer_code_seq'));

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0;

-- Stock is a count of physical units, so a negative value is always a bug
-- rather than a state to render. Prisma has no schema syntax for this, so the
-- guarantee lives here; app code validates too, but this is what makes it true.
ALTER TABLE "products" ADD CONSTRAINT "products_stock_non_negative" CHECK ("stock" >= 0);
