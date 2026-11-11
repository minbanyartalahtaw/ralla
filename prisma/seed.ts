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
      // Stock is spread on purpose: plenty, running low, and out, so the
      // products table and the order form's "N left" / "Out of stock" states
      // are all visible without editing anything first.
      { sku: "LIP-VM-01", name: "Velvet Matte Lipstick", price: 18500, stock: 42 },
      { sku: "LIP-LN-01", name: "Lip Liner", price: 11500, stock: 8 },
      { sku: "LIP-TN-01", name: "Tinted Lip Balm", price: 9500, stock: 55 },
      { sku: "LIP-GL-01", name: "Glossy Lip Oil", price: 14000, stock: 30 },
      { sku: "SRM-GLW-30", name: "Glow Serum 30ml", price: 32000, stock: 15 },
      { sku: "SRM-VC-30", name: "Vitamin C Serum 30ml", price: 38000, stock: 3 },
      { sku: "CRM-HYD-50", name: "Hydrating Day Cream 50ml", price: 27000, stock: 19 },
      { sku: "CLN-FOAM-100", name: "Gentle Foam Cleanser 100ml", price: 15500, stock: 34 },
      { sku: "TNR-ROSE-150", name: "Rose Water Toner 150ml", price: 17000, stock: 27 },
      { sku: "MSK-SHT-05", name: "Sheet Mask (5 pack)", price: 12000, stock: 70 },
      { sku: "FND-CSH-21", name: "Cushion Foundation #21", price: 46000, stock: 0 },
      { sku: "FND-CSH-23", name: "Cushion Foundation #23", price: 46000, stock: 11 },
      { sku: "PWD-SET-01", name: "Setting Powder", price: 30000, stock: 23 },
      { sku: "SUN-SPF50", name: "Sunscreen SPF50", price: 20500, stock: 60 },
      { sku: "EYE-MSC-01", name: "Volumizing Mascara", price: 19500, stock: 25 },
      { sku: "EYE-PAL-12", name: "Eyeshadow Palette (12 colours)", price: 42000, stock: 6 },
      { sku: "BRS-SET-08", name: "Makeup Brush Set (8 pc)", price: 35000, stock: 9 },
      { sku: "NAIL-GEL-05", name: "Gel Nail Polish", price: 8500, stock: 48 },
      // Discontinued: hidden from the order picker but still on old orders.
      { sku: "SET-ROSE-GIFT", name: "Rose Gift Set (limited)", price: 78000, stock: 0, isActive: false },
    ].map((data) => prisma.product.create({ data })),
  );

  const bySku = new Map(products.map((p) => [p.sku, p]));
  const product = (sku: string) => {
    const found = bySku.get(sku);
    if (!found) throw new Error(`Seed references unknown SKU: ${sku}`);
    return found;
  };

  const customerData = {
    thanda: {
      name: "မသန္တာဝင်း",
      phone: "09770112233",
      city: "ရန်ကုန်တိုင်းဒေသကြီး",
      address: "No. 12, Bogyoke Road, Latha",
      note: "Repeat buyer — prefers evening delivery.",
    },
    khin: {
      name: "ခင်မျိုးသူ",
      phone: "09442887100",
      city: "မန္တလေးတိုင်းဒေသကြီး",
      address: "78th Street, between 32 and 33",
    },
    aye: {
      name: "မအေးမြတ်သူ",
      phone: "09250123456",
      city: "ရန်ကုန်တိုင်းဒေသကြီး",
      address: "No. 45, Pyay Road, Kamayut",
      note: "Ring the bell twice — apartment block, 3rd floor.",
    },
    su: {
      name: "မစုမွန်ဦး",
      phone: "09798456123",
      city: "ရန်ကုန်တိုင်းဒေသကြီး",
      address: "No. 8, Min Ye Kyaw Swar Road, Sanchaung",
    },
    zaw: {
      name: "ကိုဇော်မင်းထက်",
      phone: "09421987654",
      city: "မန္တလေးတိုင်းဒေသကြီး",
      address: "No. 210, 26th Street, Chanayethazan",
      note: "Buys gifts for his sister — likes gift wrap.",
    },
    hnin: {
      name: "မနှင်းဆီဝင်း",
      phone: "09266778899",
      city: "နေပြည်တော်",
      address: "Zabuthiri Township, Building 14, Room 6",
    },
    thida: {
      name: "မသီတာလှိုင်",
      phone: "09955123987",
      city: "ရန်ကုန်တိုင်းဒေသကြီး",
      address: "No. 77, Insein Road, Insein",
    },
    uma: {
      name: "ဒေါ်ခင်ဥမ္မာ",
      phone: "09401556677",
      city: "ပဲခူးတိုင်းဒေသကြီး",
      address: "No. 5, Strand Road, Bago",
      note: "Orders in bulk for her salon.",
    },
    phyu: {
      name: "မဖြူဖြူစံ",
      phone: "09783004455",
      city: "မွန်ပြည်နယ်",
      address: "No. 31, Strand Road, Mawlamyine",
    },
    aeint: {
      name: "မအိမ့်ချမ်းသာ",
      phone: "09970665544",
      city: "ရန်ကုန်တိုင်းဒေသကြီး",
      address: "No. 19, Thanlwin Road, Hlaing",
    },
    may: {
      name: "မမေသဇင်",
      phone: "09259441122",
      city: "ရှမ်းပြည်နယ်",
      address: "Myoma Market Road, Taunggyi",
    },
    kyaw: {
      name: "ကိုအောင်ကျော်စိုး",
      phone: "09450337788",
      city: "ရန်ကုန်တိုင်းဒေသကြီး",
      address: "No. 102, Thitsar Road, South Okkalapa",
    },
    cho: {
      name: "မချိုချိုမြင့်",
      phone: "09792118833",
      city: "ဧရာဝတီတိုင်းဒေသကြီး",
      address: "No. 66, Mahabandoola Road, Pathein",
    },
    wah: {
      name: "မဝါဝါထွေး",
      phone: "09428990011",
      city: "မန္တလေးတိုင်းဒေသကြီး",
      address: "No. 14, 35th Street, Aungmyaythazan",
    },
    zin: {
      name: "မဇင်မာအောင်",
      phone: "09960227744",
      city: "ရန်ကုန်တိုင်းဒေသကြီး",
      address: "No. 3, Waizayanta Road, Thingangyun",
    },
  };
  type CustomerKey = keyof typeof customerData;

  const customerByKey = new Map<
    CustomerKey,
    Awaited<ReturnType<typeof prisma.customer.create>>
  >();
  // Sequential, so the RLC- codes come out in the order written here.
  for (const key of Object.keys(customerData) as CustomerKey[]) {
    customerByKey.set(
      key,
      await prisma.customer.create({ data: customerData[key] }),
    );
  }
  const customer = (key: CustomerKey) => {
    const found = customerByKey.get(key);
    if (!found) throw new Error(`Seed references unknown customer: ${key}`);
    return found;
  };

  /** Line totals must add up to the order total — that's the point of storing both. */
  function lines(entries: [sku: string, quantity: number][]) {
    const items = entries.map(([sku, quantity]) => {
      const p = product(sku);
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unitPrice: p.price,
        quantity,
      };
    });
    const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    return { items, total };
  }

  type Status = "pending" | "packing" | "shipped" | "delivered" | "cancelled";
  type PaymentMethod = "paid" | "cod" | "refunded";

  type OrderSeed = {
    customer: CustomerKey;
    /** How long ago it was placed, in days, plus hours for variety. */
    daysAgo: number;
    hoursAgo?: number;
    lines: [sku: string, quantity: number][];
    payment: PaymentMethod;
    status: Status;
    /** For cancelled orders: the stage it was cancelled from. */
    cancelledFrom?: "pending" | "packing";
    note?: string;
    notifyBySms?: boolean;
  };

  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const now = Date.now();

  /** Cumulative hours after placement at which each stage is normally reached. */
  const STAGE_HOURS = { pending: 0, packing: 4, shipped: 28, delivered: 76 };
  const FLOW = ["pending", "packing", "shipped", "delivered"] as const;
  const COURIER = "Royal Express";

  function history(spec: OrderSeed, placedAt: number) {
    const at = (hours: number) => new Date(Math.min(placedAt + hours * HOUR, now));
    const event = (status: Status, hours: number, changedBy: string) => ({
      status,
      changedBy,
      changedAt: at(hours),
    });

    if (spec.status === "cancelled") {
      const events = [event("pending", 0, "system")];
      if (spec.cancelledFrom === "packing") {
        events.push(event("packing", STAGE_HOURS.packing, "Su Su"));
        events.push(event("cancelled", STAGE_HOURS.packing + 5, "Su Su"));
      } else {
        events.push(event("cancelled", 6, "Su Su"));
      }
      return events;
    }

    return FLOW.slice(0, FLOW.indexOf(spec.status) + 1).map((stage) =>
      event(
        stage,
        STAGE_HOURS[stage],
        stage === "pending" ? "system" : stage === "packing" ? "Su Su" : COURIER,
      ),
    );
  }

  // Newest orders are still moving; older ones have settled. The mix covers
  // every status, all three payment methods, and a spread of customers so the
  // dashboard, filters and customer pages all have something to show.
  const orderSeeds: OrderSeed[] = [
    // Today and yesterday — mostly still pending or packing.
    { customer: "aye", daysAgo: 0, hoursAgo: 1, lines: [["SUN-SPF50", 2], ["CLN-FOAM-100", 1]], payment: "cod", status: "pending" },
    { customer: "su", daysAgo: 0, hoursAgo: 3, lines: [["LIP-VM-01", 1], ["LIP-LN-01", 1]], payment: "paid", status: "pending" },
    { customer: "hnin", daysAgo: 0, hoursAgo: 6, lines: [["SRM-GLW-30", 1], ["MSK-SHT-05", 2]], payment: "paid", status: "packing", note: "Gift — please include a card." },
    { customer: "thida", daysAgo: 1, hoursAgo: 2, lines: [["EYE-MSC-01", 1], ["EYE-PAL-12", 1]], payment: "cod", status: "packing" },
    { customer: "zaw", daysAgo: 1, hoursAgo: 8, lines: [["BRS-SET-08", 1], ["LIP-GL-01", 2]], payment: "paid", status: "pending", note: "Gift wrap for his sister's birthday." },
    // A few days back — shipped and on their way.
    { customer: "uma", daysAgo: 2, hoursAgo: 4, lines: [["MSK-SHT-05", 10], ["TNR-ROSE-150", 4], ["CLN-FOAM-100", 4]], payment: "paid", status: "shipped", note: "Salon restock — leave with the shop next door if closed." },
    { customer: "phyu", daysAgo: 2, hoursAgo: 10, lines: [["CRM-HYD-50", 1], ["SUN-SPF50", 1]], payment: "cod", status: "shipped" },
    { customer: "may", daysAgo: 3, hoursAgo: 1, lines: [["SRM-VC-30", 1]], payment: "paid", status: "shipped" },
    { customer: "wah", daysAgo: 3, hoursAgo: 7, lines: [["LIP-TN-01", 3]], payment: "cod", status: "packing" },
    { customer: "aeint", daysAgo: 4, hoursAgo: 5, lines: [["FND-CSH-23", 1], ["PWD-SET-01", 1]], payment: "paid", status: "delivered" },
    { customer: "cho", daysAgo: 4, hoursAgo: 11, lines: [["NAIL-GEL-05", 4]], payment: "cod", status: "shipped", notifyBySms: false },
    { customer: "thanda", daysAgo: 5, hoursAgo: 3, lines: [["LIP-VM-01", 1], ["LIP-GL-01", 1]], payment: "paid", status: "delivered", note: "Evening delivery, after 6pm." },
    { customer: "khin", daysAgo: 6, hoursAgo: 9, lines: [["SRM-GLW-30", 2]], payment: "cod", status: "delivered" },
    // Cancellations, with the refund recorded where money had changed hands.
    { customer: "kyaw", daysAgo: 6, hoursAgo: 2, lines: [["LIP-VM-01", 2]], payment: "cod", status: "cancelled", cancelledFrom: "pending", note: "Customer changed their mind." },
    { customer: "zin", daysAgo: 8, hoursAgo: 6, lines: [["FND-CSH-23", 1], ["EYE-MSC-01", 1]], payment: "refunded", status: "cancelled", cancelledFrom: "packing", note: "Wrong shade — refunded in full." },
    // Last two weeks — settled.
    { customer: "aye", daysAgo: 9, hoursAgo: 4, lines: [["TNR-ROSE-150", 1], ["CRM-HYD-50", 1]], payment: "paid", status: "delivered" },
    { customer: "su", daysAgo: 10, hoursAgo: 8, lines: [["EYE-PAL-12", 1]], payment: "paid", status: "delivered" },
    { customer: "hnin", daysAgo: 11, hoursAgo: 1, lines: [["MSK-SHT-05", 3], ["SUN-SPF50", 1]], payment: "cod", status: "delivered" },
    { customer: "uma", daysAgo: 13, hoursAgo: 5, lines: [["LIP-VM-01", 6], ["LIP-LN-01", 6], ["NAIL-GEL-05", 10]], payment: "paid", status: "delivered", note: "Bulk — 5% off agreed over Viber." },
    { customer: "thida", daysAgo: 14, hoursAgo: 12, lines: [["SRM-VC-30", 1], ["SUN-SPF50", 1]], payment: "cod", status: "delivered" },
    { customer: "zaw", daysAgo: 16, hoursAgo: 3, lines: [["SET-ROSE-GIFT", 1]], payment: "paid", status: "delivered", note: "Gift set — last one sold." },
    { customer: "wah", daysAgo: 18, hoursAgo: 6, lines: [["FND-CSH-21", 1]], payment: "cod", status: "delivered" },
    { customer: "may", daysAgo: 19, hoursAgo: 9, lines: [["LIP-GL-01", 2], ["LIP-TN-01", 2]], payment: "paid", status: "cancelled", cancelledFrom: "pending" },
    // Older history — gives the dashboard and customer pages some depth.
    { customer: "thanda", daysAgo: 22, hoursAgo: 2, lines: [["CLN-FOAM-100", 1], ["TNR-ROSE-150", 1], ["CRM-HYD-50", 1]], payment: "paid", status: "delivered" },
    { customer: "phyu", daysAgo: 25, hoursAgo: 7, lines: [["SUN-SPF50", 3]], payment: "cod", status: "delivered" },
    { customer: "kyaw", daysAgo: 28, hoursAgo: 10, lines: [["LIP-LN-01", 1], ["EYE-MSC-01", 1]], payment: "cod", status: "delivered" },
    { customer: "cho", daysAgo: 31, hoursAgo: 4, lines: [["SRM-GLW-30", 1], ["MSK-SHT-05", 2]], payment: "paid", status: "delivered" },
    { customer: "aeint", daysAgo: 35, hoursAgo: 8, lines: [["BRS-SET-08", 1]], payment: "paid", status: "delivered" },
    { customer: "khin", daysAgo: 38, hoursAgo: 1, lines: [["LIP-VM-01", 1], ["PWD-SET-01", 1]], payment: "cod", status: "delivered" },
    { customer: "zin", daysAgo: 42, hoursAgo: 5, lines: [["NAIL-GEL-05", 2], ["LIP-TN-01", 1]], payment: "cod", status: "delivered" },
    { customer: "uma", daysAgo: 47, hoursAgo: 9, lines: [["CLN-FOAM-100", 6], ["SUN-SPF50", 6]], payment: "paid", status: "delivered", note: "Salon restock." },
    { customer: "aye", daysAgo: 52, hoursAgo: 3, lines: [["SRM-VC-30", 1], ["MSK-SHT-05", 1]], payment: "paid", status: "delivered" },
    { customer: "su", daysAgo: 58, hoursAgo: 6, lines: [["FND-CSH-21", 1], ["PWD-SET-01", 1]], payment: "refunded", status: "cancelled", cancelledFrom: "packing", note: "Out of stock before it was packed — refunded." },
  ];

  // Same-day codes can collide (see order-code.ts), so keep a set here and
  // draw again rather than lean on the unique index.
  const usedCodes = new Set<string>();
  function uniqueCode(placed: Date) {
    let code = generateOrderCode(placed);
    while (usedCodes.has(code)) code = generateOrderCode(placed);
    usedCodes.add(code);
    return code;
  }

  // Oldest first, so ids and codes read in the order the orders were placed.
  const ordered = [...orderSeeds].sort(
    (a, b) =>
      b.daysAgo * 24 + (b.hoursAgo ?? 0) - (a.daysAgo * 24 + (a.hoursAgo ?? 0)),
  );

  for (const spec of ordered) {
    const c = customer(spec.customer);
    const { items, total } = lines(spec.lines);
    const placedAtMs = now - spec.daysAgo * DAY - (spec.hoursAgo ?? 0) * HOUR;
    const placedAt = new Date(placedAtMs);

    await prisma.order.create({
      data: {
        code: uniqueCode(placedAt),
        customerId: c.id,
        customerName: c.name,
        phone: c.phone,
        city: c.city,
        address: c.address,
        total,
        paymentMethod: spec.payment,
        status: spec.status,
        notifyBySms: spec.notifyBySms ?? true,
        note: spec.note ?? "",
        placedAt,
        createdAt: placedAt,
        items: { create: items },
        statusEvents: { create: history(spec, placedAtMs) },
      },
    });
  }

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
