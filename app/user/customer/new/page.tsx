import type { Metadata } from "next";

import { CustomerForm } from "./customer-form";

export const metadata: Metadata = {
  title: "New customer — RALLA",
};

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mt-6">
        <CustomerForm />
      </div>
    </div>
  );
}
