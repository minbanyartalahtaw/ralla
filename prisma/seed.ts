/**
 * Development seed. Run with `npm run db:seed`.
 *
 * Replaces the fixtures that used to live in lib/customer-store.ts and
 * lib/order-store.ts. Idempotent: it clears the tables first, so re-running
 * gives the same result rather than piling up duplicates.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";
import { generateOrderCode } from "../lib/order-code";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  // Order matters: children before parents, or the FKs complain.
  await prisma.orderStatusEvent.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();

  const products = await Promise.all(
    [
      { sku: "LIP-VM-01", name: "Velvet Matte Lipstick", price: 18500 },
      { sku: "LIP-LN-01", name: "Lip Liner", price: 11500 },
      { sku: "SRM-GLW-30", name: "Glow Serum 30ml", price: 32000 },
      { sku: "FND-CSH-21", name: "Cushion Foundation #21", price: 46000 },
      { sku: "PWD-SET-01", name: "Setting Powder", price: 30000 },
      { sku: "SUN-SPF50", name: "Sunscreen SPF50", price: 20500 },
    ].map((data) => prisma.product.create({ data })),
  );

  const bySku = new Map(products.map((p) => [p.sku, p]));
  const product = (sku: string) => {
    const found = bySku.get(sku);
    if (!found) throw new Error(`Seed references unknown SKU: ${sku}`);
    return found;
  };

  const thanda = await prisma.customer.create({
    data: {
      tiktokUsername: "thanda.beauty",
      tiktokName: "Thanda Beauty 🌸",
      name: "မသန္တာဝင်း",
      phone: "09 770 112 233",
      city: "Yangon",
      address: "No. 12, Bogyoke Road, Latha",
      note: "Repeat buyer — prefers evening delivery.",
    },
  });

  const khin = await prisma.customer.create({
    data: {
      tiktokUsername: "khinmyothu",
      tiktokName: "Khin Myo Thu",
      name: "ခင်မျိုးသူ",
      phone: "09 442 887 100",
      city: "Mandalay",
      address: "78th Street, between 32 and 33",
    },
  });

  /** Line totals must add up to the order total — that's the point of storing both. */
  function lines(entries: { sku: string; quantity: number }[]) {
    const items = entries.map(({ sku, quantity }) => {
      const p = product(sku);
      return {
        productId: p.id,
        name: p.name,
        unitPrice: p.price,
        quantity,
      };
    });
    const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    return { items, total };
  }

  const delivered = lines([
    { sku: "LIP-VM-01", quantity: 2 },
    { sku: "LIP-LN-01", quantity: 1 },
  ]);

  await prisma.order.create({
    data: {
      code: generateOrderCode(),
      customerId: thanda.id,
      customerName: thanda.name,
      phone: thanda.phone,
      city: thanda.city,
      address: thanda.address,
      total: delivered.total,
      paymentMethod: "paid",
      status: "delivered",
      items: { create: delivered.items },
      statusEvents: {
        create: [
          { status: "pending", changedBy: "system" },
          { status: "packing", changedBy: "Su Su" },
          { status: "shipped", changedBy: "Royal Express" },
          { status: "delivered", changedBy: "Royal Express" },
        ],
      },
    },
  });

  const shipped = lines([{ sku: "SRM-GLW-30", quantity: 1 }]);

  await prisma.order.create({
    data: {
      code: generateOrderCode(),
      customerId: khin.id,
      customerName: khin.name,
      phone: khin.phone,
      city: khin.city,
      address: khin.address,
      total: shipped.total,
      paymentMethod: "cod",
      status: "shipped",
      items: { create: shipped.items },
      statusEvents: {
        create: [
          { status: "pending", changedBy: "system" },
          { status: "packing", changedBy: "Su Su" },
          { status: "shipped", changedBy: "Royal Express" },
        ],
      },
    },
  });

  const [customers, orders, items] = await Promise.all([
    prisma.customer.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
  ]);
  console.log(
    `Seeded ${products.length} products, ${customers} customers, ${orders} orders, ${items} order items.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
