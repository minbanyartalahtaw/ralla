import type { Metadata } from "next";

import { requireAbility } from "@/lib/auth";
import { listStaff } from "@/lib/staff-store";

import { Section } from "../settings/field";
import { AddStaffForm, StaffRowActions } from "./staff-forms";
import { adminSectionOnly } from "@/app/office/[section]/_components/section";

export const metadata: Metadata = {
  title: "Staff — RALLA",
};

const ROLE_LABEL = { admin: "Admin", staff: "Staff" } as const;

/**
 * Admin only: who can sign in, and as what. Plain on purpose — styled to match
 * the app in Phase 5 of docs/role.md.
 */
export default async function StaffPage({ params }: PageProps<"/office/[section]/staff">) {
  const me = await requireAbility("manageStaff");
  await adminSectionOnly(params);
  const people = await listStaff();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-xl font-bold tracking-[0.2em] text-transparent uppercase">
        Staff
      </h1>

      <div className="mt-6 space-y-6">
        <Section title="Accounts">
          <ul className="-my-2 divide-y">
            {people.map((person) => (
              <li
                key={person.id}
                className="flex flex-col gap-3 py-3 text-xs sm:flex-row sm:items-center"
              >
                <div className={`flex min-w-0 flex-1 items-center gap-3 ${person.active ? "" : "opacity-60"}`}>
                  {/* Same initial badge as the sidebar footer. */}
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground uppercase"
                    aria-hidden
                  >
                    {(person.name || person.username).slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {person.name || "—"}
                      {person.id === me.id ? (
                        <span className="font-normal text-muted-foreground"> (you)</span>
                      ) : null}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-mono">{person.username}</span>
                      <span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        {ROLE_LABEL[person.role]}
                      </span>
                      {person.active ? null : (
                        <span className="rounded-sm bg-cancelled-soft px-1.5 py-0.5 font-medium text-cancelled">
                          Turned off
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {person.id === me.id ? null : (
                  <StaffRowActions
                    id={person.id}
                    name={person.name}
                    role={person.role}
                    active={person.active}
                  />
                )}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Add an account">
          <AddStaffForm />
        </Section>
      </div>
    </div>
  );
}
