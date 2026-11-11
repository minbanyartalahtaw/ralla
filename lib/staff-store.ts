/**
 * Persistence for sign-in accounts. Like the other `*-store.ts` files, the only
 * place that talks to Prisma for this table.
 */

import { prisma } from "@/lib/prisma";
import type { StaffRole } from "@/generated/prisma/client";

export type Staff = {
  id: number;
  name: string;
  username: string;
  passwordHash: string;
  role: StaffRole;
  active: boolean;
};

const select = {
  id: true,
  name: true,
  username: true,
  passwordHash: true,
  role: true,
  active: true,
} as const;

/** Usernames are stored trimmed and lowercased, so lookups do the same. */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function findStaffByUsername(username: string): Promise<Staff | null> {
  return prisma.staff.findUnique({
    where: { username: normalizeUsername(username) },
    select,
  });
}

export function getStaff(id: number): Promise<Staff | null> {
  return prisma.staff.findUnique({ where: { id }, select });
}

export function updateStaffName(id: number, name: string): Promise<Staff> {
  return prisma.staff.update({ where: { id }, data: { name }, select });
}

export function updateStaffPassword(
  id: number,
  passwordHash: string,
): Promise<Staff> {
  return prisma.staff.update({ where: { id }, data: { passwordHash }, select });
}
