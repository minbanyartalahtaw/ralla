import type { Metadata } from "next";

import { BackButton } from "@/components/back-button";

import { CustomerForm } from "./customer-form";

export const metadata: Metadata = {
  title: "New customer — RALLA",
};

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <BackButton fallback="/user/customer" />
        <h1 className="bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-xl font-bold tracking-[0.2em] text-transparent uppercase">
          New customer
        </h1>
      </div>
      <div className="mt-6">
        <CustomerForm />
      </div>
    </div>
  );
}
