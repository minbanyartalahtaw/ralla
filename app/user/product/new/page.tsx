import type { Metadata } from "next";

import { ProductForm } from "./product-form";

export const metadata: Metadata = {
  title: "New product — RALLA",
};

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}
