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
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <BackButton fallback="/user/order" />
        <h1 className="bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-xl font-bold tracking-[0.2em] text-transparent uppercase">
          New order
        </h1>
      </div>
      <div className="mt-6">
        <OrderForm products={products} />
      </div>
    </div>
  );
}
