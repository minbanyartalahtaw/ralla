-- Adds a display name to staff. Additive and defaulted ('' for any row that
-- predates it), so it is safe in one step and in either order with a deploy.

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';
