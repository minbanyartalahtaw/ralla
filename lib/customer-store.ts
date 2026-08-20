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
 * `RLC-` code and phone. The order form's type-ahead is narrower — see
 * searchCustomers() — because it needs one unambiguous row, not a browseable
 * list.
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
 * Type-ahead over saved customers, by `RLC-` code only — never by name.
 *
 * A name is common enough that early keystrokes match a dozen unrelated
 * customers, so staff had to read every row before finding the right one. The
 * code is what's on the packing slip in front of them and unique by
 * construction, so it's the only lookup that goes straight to one row.
 *
 * Spaces come off anywhere, same as normalizeOrderQuery(): a code copied out
 * of a chat message arrives with stray whitespace often enough to matter. The
 * leading `RLC-` is optional for the same reason it's optional there — typing
 * the prefix the field already implies is wasted keystrokes.
 */
export async function searchCustomers(
  query: string,
  limit = 8,
): Promise<Customer[]> {
  const q = query.replace(/\s+/g, "").replace(/^rlc-?/i, "");
  if (q.length < 1) return [];

  return prisma.customer.findMany({
    where: { code: { contains: q, mode: "insensitive" } },
    orderBy: { code: "asc" },
    take: limit,
  });
}

export async function createCustomer(input: NewCustomer): Promise<Customer> {
  return prisma.customer.create({ data: input });
}

/**
 * Updates a customer's own record — the detail page's Edit action.
 *
 * `id` only, never `code` or `tiktokUsername`: both can appear in the input
 * (a rename is exactly what this saves) but neither is stable enough to key
 * the WHERE clause on. This never touches past orders — see the domain note
 * in CLAUDE.md: an order snapshots the customer's details at the time it was
 * placed, so moving house today can't rewrite where last month's parcel
 * actually went.
 */
export async function updateCustomer(
  id: number,
  input: NewCustomer,
): Promise<Customer> {
  return prisma.customer.update({ where: { id }, data: input });
}
