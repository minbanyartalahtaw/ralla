-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "avatar" TEXT,
ALTER COLUMN "code" SET DEFAULT ('RLC-' || nextval('customer_code_seq'));
