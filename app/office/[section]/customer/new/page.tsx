import type { Metadata } from "next";

import { BackButton } from "@/components/back-button";

import { CustomerForm } from "./customer-form";
import { getSection } from "@/app/office/[section]/_components/section";

export const metadata: Metadata = {
  title: "New customer — RALLA",
};

export default async function NewCustomerPage({
  params,
}: PageProps<"/office/[section]/customer/new">) {
  const { base } = await getSection(params);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <BackButton fallback={`${base}/customer`} />
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
