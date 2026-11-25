import type { Metadata } from "next";

import { BackButton } from "@/components/back-button";
import { listActiveProducts } from "@/lib/product-store";

import { OrderForm } from "../order-form";
import { createOrderAction } from "./actions";
import { getSection } from "@/app/office/[section]/_components/section";

export const metadata: Metadata = {
  title: "New order — RALLA",
};

export default async function NewOrderPage({ params }: PageProps<"/office/[section]/order/new">) {
  const { base } = await getSection(params);
  // Loaded here rather than in the form so the picker is populated on first
  // paint, with no client round-trip.
  const products = await listActiveProducts();

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="flex items-center gap-3">
        <BackButton fallback={`${base}/order`} />
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          New order
        </h1>
      </div>
      <div className="mt-6">
        <OrderForm products={products} action={createOrderAction} />
      </div>
    </div>
  );
}
