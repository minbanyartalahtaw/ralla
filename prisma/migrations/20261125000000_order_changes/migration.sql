-- Order change log, "made by", and soft delete (docs/role.md, Phase 2).
--
-- Additive only: one new enum, one new table, three nullable columns on
-- orders, indexes and foreign keys. Nothing existing is altered or dropped, so
-- the deployed app keeps working whether this lands before or after the code.
--
-- `prisma migrate diff` also emitted `ALTER COLUMN … SET DEFAULT` for the
-- dbgenerated code/slug defaults. Those are already in place (add_slugs); the
-- diff re-emits them every time, so they were removed by hand.

-- CreateEnum
CREATE TYPE "OrderChangeAction" AS ENUM ('created', 'updated', 'status', 'note', 'deleted', 'restored');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(3),
ADD COLUMN     "deleted_by_id" INTEGER;

-- CreateTable
CREATE TABLE "order_changes" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "staff_id" INTEGER,
    "staff_name" TEXT NOT NULL,
    "action" "OrderChangeAction" NOT NULL,
    "field" TEXT NOT NULL DEFAULT '',
    "old_value" TEXT NOT NULL DEFAULT '',
    "new_value" TEXT NOT NULL DEFAULT '',
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_changes_order_id_changed_at_idx" ON "order_changes"("order_id", "changed_at");

-- CreateIndex
CREATE INDEX "orders_deleted_at_idx" ON "orders"("deleted_at");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_changes" ADD CONSTRAINT "order_changes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_changes" ADD CONSTRAINT "order_changes_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

