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
          <ul className="-my-3.5 divide-y">
            {people.map((person) => (
              <li key={person.id} className="flex items-center gap-3 py-3.5 text-xs">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground uppercase ${person.active ? "" : "opacity-50 grayscale"}`}
                  aria-hidden
                >
                  {(person.name || person.username).slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-2">
                    <span className={`truncate font-medium ${person.active ? "" : "text-muted-foreground"}`}>
                      {person.name || person.username}
                    </span>
                    {person.id === me.id ? (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                        You
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="truncate font-mono">@{person.username}</span>
                    <span className="shrink-0 sm:hidden">
                      · {ROLE_LABEL[person.role]}
                      {person.active ? "" : " · Turned off"}
                    </span>
                  </p>
                </div>
                <div className="hidden w-20 shrink-0 sm:block">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${person.role === "admin" ? "bg-primary/10 text-primary dark:bg-primary/25 dark:text-foreground" : "bg-muted text-foreground"}`}
                  >
                    {ROLE_LABEL[person.role]}
                  </span>
                </div>
                <div className="hidden w-24 shrink-0 items-center gap-1.5 text-[11px] sm:flex">
                  <span
                    aria-hidden
                    className={`size-1.5 rounded-full ${person.active ? "bg-delivered" : "bg-cancelled"}`}
                  />
                  <span className={person.active ? "text-foreground" : "text-muted-foreground"}>
                    {person.active ? "Active" : "Turned off"}
                  </span>
                </div>
                <div className="flex w-24 shrink-0 justify-end">
                  {/* No actions on your own row (Settings) or on another admin's —
                      the server refuses both anyway. */}
                  {person.role === "admin" ? null : (
                    <StaffRowActions
                      id={person.id}
                      name={person.name}
                      role={person.role}
                      active={person.active}
                    />
                  )}
                </div>
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
