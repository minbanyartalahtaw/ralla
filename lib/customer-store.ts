/**
 * TEMPORARY persistence layer — same caveats as lib/order-store.ts.
 *
 * ⚠ In-memory array. Customers are lost on server restart, and on a serverless
 * host each instance gets its own copy. Swap the function bodies for real
 * queries when a database is chosen; nothing else touches storage.
 *
 * Server-only — never import this from a Client Component.
 */

import type { Customer, NewCustomer } from "@/lib/customers";

/**
 * The array is stashed on globalThis so Next's dev HMR doesn't wipe it on every
 * file save. That means a change to the seed *shape* is invisible until the
 * cache is dropped — bump SEED_VERSION whenever you add or rename a field, and
 * the next reload reseeds instead of serving records missing the new field.
 */
const SEED_VERSION = 2;
const CACHE_KEY = `__rallaCustomers_v${SEED_VERSION}`;

const globalStore = globalThis as unknown as Record<string, Customer[] | undefined>;

const customers: Customer[] = (globalStore[CACHE_KEY] ??= [
  {
    id: "RLC-1001",
    tiktokUsername: "thanda.beauty",
    tiktokName: "Thanda Beauty 🌸",
    name: "မသန္တာဝင်း",
    phone: "09 770 112 233",
    city: "Yangon",
    address: "No. 12, Bogyoke Road, Latha",
    note: "Repeat buyer — prefers evening delivery.",
    createdAt: "2026-07-14",
  },
  {
    id: "RLC-1002",
    tiktokUsername: "khinmyothu",
    tiktokName: "Khin Myo Thu",
    name: "ခင်မျိုးသူ",
    phone: "09 442 887 100",
    city: "Mandalay",
    address: "78th Street, between 32 and 33",
    note: "",
    createdAt: "2026-07-28",
  },
]);

const ID_PREFIX = "RLC-";

function nextCustomerId() {
  const highest = customers.reduce((max, c) => {
    if (!c.id.startsWith(ID_PREFIX)) return max;
    const n = Number.parseInt(c.id.slice(ID_PREFIX.length), 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 1000);
  return `${ID_PREFIX}${highest + 1}`;
}

export async function listCustomers(): Promise<Customer[]> {
  return [...customers].reverse();
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  return customers.find((c) => c.id === id);
}

/**
 * The lookup behind the new-order autofill. `handle` must already be
 * normalized — call normalizeTiktokUsername() first.
 */
export async function findCustomerByTiktok(
  handle: string,
): Promise<Customer | undefined> {
  return customers.find((c) => c.tiktokUsername === handle);
}

/**
 * Type-ahead search behind the new-order autofill. Matches the handle, the
 * TikTok display name, or the real name — staff may remember any of the three.
 * Handle prefix matches rank first, since that's what they usually type.
 */
export async function searchCustomers(
  query: string,
  limit = 8,
): Promise<Customer[]> {
  const q = query.trim().toLowerCase().replace(/^@+/, "");
  if (q.length < 2) return [];

  return customers
    .filter(
      (c) =>
        c.tiktokUsername.includes(q) ||
        c.tiktokName.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q),
    )
    .sort((a, b) => {
      const aStarts = a.tiktokUsername.startsWith(q) ? 0 : 1;
      const bStarts = b.tiktokUsername.startsWith(q) ? 0 : 1;
      return aStarts - bStarts;
    })
    .slice(0, limit);
}

export async function createCustomer(input: NewCustomer): Promise<Customer> {
  const customer: Customer = {
    ...input,
    id: nextCustomerId(),
    createdAt: new Date().toISOString().slice(0, 10),
  };
  customers.push(customer);
  return customer;
}
