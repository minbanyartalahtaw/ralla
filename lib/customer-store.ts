/**
 * Customer persistence.
 *
 * Server-only — never import this from a Client Component.
 */

import { prisma } from "@/lib/prisma";
import type { Customer, NewCustomer } from "@/lib/customers";

/** Trimmed only — a real name is free text, so inner spaces are real. */
export function normalizeCustomerQuery(query: string | undefined): string {
  return (query ?? "").trim();
}

/**
 * Customers whose phone matches, comparing digits only.
 *
 * Phone numbers are stored exactly as they were typed, and staff type them both
 * ways — `09777444622` and `09 770 112 233` are both in the table. A plain
 * `contains` would make finding a customer depend on punctuating the number the
 * same way whoever created them did, which nobody can be expected to remember.
 *
 * Needs raw SQL because the comparison has to strip characters from the
 * *column*, which Prisma's query builder can't express. Returns ids so the
 * caller can OR it into an ordinary Prisma query and keep the model types.
 */
async function customerIdsByPhone(query: string): Promise<number[]> {
  const digits = query.replace(/\D/g, "");
  // Two digits would match nearly every row and mean nothing.
  if (digits.length < 3) return [];

  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM customers
    WHERE regexp_replace(phone, '[^0-9]', '', 'g') LIKE ${`%${digits}%`}
  `;
  return rows.map((row) => row.id);
}

/**
 * Every customer, newest first — or the ones matching `query`.
 *
 * Matches the four things the list actually shows: real name, TikTok handle,
 * `RLC-` code and phone. `tiktokName` is searchable in the order form's
 * type-ahead but not here — the list doesn't show it, so a row matching on it
 * would appear with nothing highlighted and no visible reason for being there.
 *
 * A leading `@` comes off before the handle is compared. Handles are stored
 * normalized (lowercase, no `@`) but they are read off the screen with one, so
 * that is how they get typed back in.
 */
export async function listCustomers(query?: string): Promise<Customer[]> {
  const q = normalizeCustomerQuery(query);
  const newestFirst = { createdAt: "desc" } as const;

  if (q === "") {
    return prisma.customer.findMany({ orderBy: newestFirst });
  }

  const phoneMatches = await customerIdsByPhone(q);

  return prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { tiktokUsername: { contains: q.replace(/^@+/, ""), mode: "insensitive" } },
        // `RLC-1013` typed as `1013`, `rlc-1013` or in full all reach the row.
        { code: { contains: q, mode: "insensitive" } },
        { id: { in: phoneMatches } },
      ],
    },
    orderBy: newestFirst,
  });
}

export async function getCustomer(id: number): Promise<Customer | null> {
  return prisma.customer.findUnique({ where: { id } });
}

/**
 * Lookup by the human-facing `RLC-` code, which is what the detail URL carries.
 * The code is immutable and already on screen, so a copied link stays readable
 * and keeps pointing at the same person — neither `id` (never displayed) nor
 * the TikTok handle (renameable) can promise both.
 *
 * Uppercased first: codes are stored uppercase, but a URL comes back lowercased
 * often enough — hand-typed, or flattened by a chat client — that a case-exact
 * match would 404 on a link that is otherwise correct.
 */
export async function getCustomerByCode(code: string): Promise<Customer | null> {
  return prisma.customer.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
}

/**
 * The lookup behind the new-order autofill. `handle` must already be
 * normalized — call normalizeTiktokUsername() first.
 */
export async function findCustomerByTiktok(
  handle: string,
): Promise<Customer | null> {
  return prisma.customer.findUnique({ where: { tiktokUsername: handle } });
}

/**
 * Type-ahead search. Matches the handle, the TikTok display name, or the real
 * name — staff may remember any of the three. Handle prefix matches rank first,
 * since that's what they usually type.
 */
export async function searchCustomers(
  query: string,
  limit = 8,
): Promise<Customer[]> {
  const q = query.trim().toLowerCase().replace(/^@+/, "");
  if (q.length < 2) return [];

  const matches = await prisma.customer.findMany({
    where: {
      OR: [
        { tiktokUsername: { contains: q } },
        { tiktokName: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    // Over-fetch so the prefix ranking below has something to reorder.
    take: limit * 3,
    orderBy: { name: "asc" },
  });

  return matches
    .sort((a, b) => {
      const aStarts = a.tiktokUsername.startsWith(q) ? 0 : 1;
      const bStarts = b.tiktokUsername.startsWith(q) ? 0 : 1;
      return aStarts - bStarts;
    })
    .slice(0, limit);
}

export async function createCustomer(input: NewCustomer): Promise<Customer> {
  return prisma.customer.create({ data: input });
}
