import type { Metadata } from "next";

import { BackButton } from "@/components/back-button";
import { listActiveProducts } from "@/lib/product-store";

import { OrderForm } from "./order-form";

export const metadata: Metadata = {
  title: "New order — RALLA",
};

export default async function NewOrderPage() {
  // Loaded here rather than in the form so the picker is populated on first
  // paint, with no client round-trip.
  const products = await listActiveProducts();

  return (
    <div className="mx-auto max-w-[640px]">
      <BackButton fallback="/user/order" />
      <div className="mt-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          New order
        </h1>
      </div>
      <div className="mt-6">
        <OrderForm products={products} />
      </div>
    </div>
  );
}
