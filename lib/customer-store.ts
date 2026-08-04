/**
 * Customer persistence.
 *
 * Server-only — never import this from a Client Component.
 */

import { prisma } from "@/lib/prisma";
import type { Customer, NewCustomer } from "@/lib/customers";

export async function listCustomers(): Promise<Customer[]> {
  return prisma.customer.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getCustomer(id: number): Promise<Customer | null> {
  return prisma.customer.findUnique({ where: { id } });
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
