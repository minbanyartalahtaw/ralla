/**
 * TEMPORARY persistence layer.
 *
 * ⚠ This is an in-memory array. Orders are lost on every server restart, and
 * on a serverless host each instance gets its own copy. It exists so the
 * create-order flow is testable before a database is chosen.
 *
 * Replacing it is a one-file change: keep these three function signatures and
 * swap the bodies for real queries. Nothing else in the app touches storage.
 *
 * Server-only — never import this from a Client Component.
 */

import type { NewOrder, Order } from "@/lib/orders";

// Stashed on globalThis so Next's dev HMR doesn't reset it on every edit.
const globalStore = globalThis as unknown as { __rallaOrders?: Order[] };

const orders: Order[] = (globalStore.__rallaOrders ??= [
  {
    id: "RL-10428",
    customer: "မသန္တာဝင်း",
    phone: "09 770 112 233",
    city: "Yangon",
    address: "No. 12, Bogyoke Road, Latha",
    items: "Velvet Matte Lipstick × 2, Lip Liner",
    itemCount: 3,
    total: 48500,
    payment: "paid",
    status: "delivered",
    notifyBySms: true,
    placedAt: "2026-08-01",
  },
  {
    id: "RL-10427",
    customer: "ခင်မျိုးသူ",
    phone: "09 442 887 100",
    city: "Mandalay",
    address: "78th Street, between 32 and 33",
    items: "Glow Serum 30ml",
    itemCount: 1,
    total: 32000,
    payment: "cod",
    status: "shipped",
    notifyBySms: true,
    placedAt: "2026-08-02",
  },
]);

/** Sequential order IDs. A real database should own this instead. */
function nextOrderId() {
  const highest = orders.reduce((max, o) => {
    const n = Number.parseInt(o.id.replace("RL-", ""), 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 10000);
  return `RL-${highest + 1}`;
}

export async function listOrders(): Promise<Order[]> {
  return [...orders].reverse();
}

export async function getOrder(id: string): Promise<Order | undefined> {
  return orders.find((o) => o.id === id);
}

export async function createOrder(input: NewOrder): Promise<Order> {
  const order: Order = {
    ...input,
    id: nextOrderId(),
    // New orders always start pending — the caller doesn't get to pick.
    status: "pending",
    placedAt: new Date().toISOString().slice(0, 10),
  };
  orders.push(order);
  return order;
}
