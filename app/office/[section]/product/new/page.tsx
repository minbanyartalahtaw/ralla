import type { Metadata } from "next";

import { BackButton } from "@/components/back-button";

import { ProductForm } from "./product-form";

export const metadata: Metadata = {
  title: "New product — RALLA",
};

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <BackButton fallback="/user/product" />
        <h1 className="bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-xl font-bold tracking-[0.2em] text-transparent uppercase">
          New product
        </h1>
      </div>
      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}
