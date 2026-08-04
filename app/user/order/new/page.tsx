import type { Metadata } from "next";

import { OrderForm } from "./order-form";

export const metadata: Metadata = {
  title: "New order — RALLA",
};

export default function NewOrderPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mt-6">
        <OrderForm />
      </div>
    </div>
  );
}
