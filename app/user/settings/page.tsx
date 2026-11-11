import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentStaff } from "@/lib/auth";

import { Section } from "./field";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Settings — RALLA",
};

const ROLE_LABEL = { admin: "Admin", staff: "Staff" } as const;

export default async function SettingsPage() {
  // Cached per request, so this is the same lookup the layout already made.
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login/expired");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-xl font-bold tracking-[0.2em] text-transparent uppercase">
        Settings
      </h1>

      <div className="mt-6 space-y-6">
        <Section title="Profile">
          <dl className="mb-4 grid grid-cols-2 gap-4 text-xs">
            <div>
              <dt className="text-muted-foreground">Username</dt>
              <dd className="mt-0.5 font-medium">{staff.username}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="mt-0.5 font-medium">{ROLE_LABEL[staff.role]}</dd>
            </div>
          </dl>
          <ProfileForm name={staff.name} />
        </Section>

        <Section title="Password">
          <PasswordForm />
        </Section>
      </div>
    </div>
  );
}
