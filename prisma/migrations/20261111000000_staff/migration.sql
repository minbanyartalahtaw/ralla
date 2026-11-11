-- Adds the staff table (sign-in accounts) and its role enum.
--
-- Purely additive: a new enum and a new table, nothing existing is altered,
-- dropped or backfilled. Safe in one step and in either order with a deploy —
-- old code never looks at the table. See docs/production-migrations.md.
--
-- No rows are created here. The first admin is made with `npm run admin:create`,
-- because a password hash can't be written in SQL.

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('staff', 'admin');

-- CreateTable
CREATE TABLE "staff" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'staff',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_username_key" ON "staff"("username");
