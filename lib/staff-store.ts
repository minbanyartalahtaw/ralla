/**
 * Persistence for sign-in accounts. Like the other `*-store.ts` files, the only
 * place that talks to Prisma for this table.
 */

import type { Prisma, StaffRole } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

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

/** Everyone who has an account, admins first, then by name. */
export function listStaff(): Promise<Staff[]> {
  return prisma.staff.findMany({
    select,
    orderBy: [{ role: "desc" }, { name: "asc" }, { id: "asc" }],
  });
}

/**
 * Creates an account. Throws Prisma's P2002 when the username is taken — the
 * unique index is the guarantee, the caller turns it into a form error.
 */
export async function createStaff(input: {
  name: string;
  username: string;
  password: string;
  role: StaffRole;
}): Promise<Staff> {
  return prisma.staff.create({
    data: {
      name: input.name,
      username: normalizeUsername(input.username),
      passwordHash: await hashPassword(input.password),
      role: input.role,
    },
    select,
  });
}

/** A change that would leave the shop with no active admin. */
export class LastAdminError extends Error {
  constructor() {
    super("This is the last active admin. Make someone else an admin first.");
    this.name = "LastAdminError";
  }
}

/**
 * Refuses when `id` is the only active admin. Locks every active admin row
 * first, so two admins demoting each other at the same moment can't both see
 * "one other admin left" and leave none.
 */
async function guardLastAdmin(tx: Prisma.TransactionClient, id: number) {
  const admins = await tx.$queryRaw<{ id: number }[]>`
    SELECT "id" FROM "staff" WHERE "role" = 'admin' AND "active" FOR UPDATE
  `;
  if (admins.length === 1 && admins[0].id === id) throw new LastAdminError();
}

/** Turns an account off or on. Off signs the person out on their next click. */
export function setStaffActive(id: number, active: boolean): Promise<Staff> {
  return prisma.$transaction(async (tx) => {
    if (!active) await guardLastAdmin(tx, id);
    return tx.staff.update({ where: { id }, data: { active }, select });
  });
}

export function setStaffRole(id: number, role: StaffRole): Promise<Staff> {
  return prisma.$transaction(async (tx) => {
    if (role !== "admin") await guardLastAdmin(tx, id);
    return tx.staff.update({ where: { id }, data: { role }, select });
  });
}
