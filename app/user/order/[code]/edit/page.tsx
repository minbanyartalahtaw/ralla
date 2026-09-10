import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BackButton } from "@/components/back-button";
import { getOrderByCode } from "@/lib/order-store";
import { listProductsForOrder } from "@/lib/product-store";

import { OrderForm, type OrderFormInitial } from "../../order-form";
import { updateOrderAction } from "./actions";

export async function generateMetadata({
  params,
}: PageProps<"/user/order/[code]/edit">): Promise<Metadata> {
  const { code } = await params;
  return { title: `Edit ${code.toUpperCase()} — RALLA` };
}

export default async function EditOrderPage({
  params,
}: PageProps<"/user/order/[code]/edit">) {
  const { code } = await params;
  const order = await getOrderByCode(code);
  if (!order) notFound();

  const productIds = order.items
    .map((item) => item.productId)
    .filter((id): id is number => id !== null);
  // Active products plus the ones this order already has lines for, so a since
  // deactivated product still renders as the line it was sold on.
  const products = await listProductsForOrder(productIds);

  // Units this order already has off the shelf. An edit only moves the
  // difference, so these stay available to it — see HeldStock.
  const held = new Map<number, number>();
  for (const item of order.items) {
    if (item.productId === null) continue;
    held.set(item.productId, (held.get(item.productId) ?? 0) + item.quantity);
  }

  // The order's own snapshot, not the linked customer's record: this form
  // corrects where *this* parcel goes. Which customer it was placed for is not
  // among the fields — the action keeps the order's existing link.
  const initial: OrderFormInitial = {
    customerId: order.customerId,
    customer: order.customerName,
    phone: order.phone,
    city: order.city,
    address: order.address,
    payment: order.paymentMethod,
    note: order.note,
    lines: order.items.map((item) => ({
      productId: item.productId,
      unitPrice: String(item.unitPrice),
      quantity: String(item.quantity),
    })),
  };

  return (
    <div className="mx-auto max-w-[640px]">
      {/* The heading sits on the back button's row rather than under it: which
          order is being edited is the one thing this page has to say that New
          order doesn't, and stacking it cost a band of empty space above a form
          that is already long. The sections below are the same numbered ones,
          minus the code and the delivery status — the code is already printed
          on an invoice, and the status moves from the orders list, which
          records when it moved. */}
      <div className="flex items-center gap-3">
        <BackButton fallback={`/user/order/${order.code}`} />
        <h1 className="flex min-w-0 items-baseline gap-2 text-lg font-semibold tracking-tight text-foreground">
          Edit
          {/* Never wraps: a code broken after `RL-` reads as a rendering fault
              on the one string identifying what is about to be changed. */}
          <span className="numeric truncate font-mono text-base tracking-wide">
            {order.code}
          </span>
        </h1>
      </div>
      <div className="mt-6">
        <OrderForm
          products={products}
          action={updateOrderAction}
          initial={initial}
          held={held}
          hidden={{ orderId: String(order.id) }}
          allowCustomerSearch={false}
          showStockNote
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
