import type { Metadata } from "next";

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
    <div className="mx-auto max-w-3xl">
      <div className="mt-6">
        <OrderForm products={products} />
      </div>
    </div>
  );
}
