import { notFound } from "next/navigation";

import { parseSection, sectionBase, type Section } from "@/lib/permissions";

/**
 * The section a page is rendered in, from its `[section]` param, plus the link
 * prefix that keeps every link inside it. Anything but admin/staff is a 404.
 */
export async function getSection(
  params: Promise<{ section: string }>,
): Promise<{ section: Section; base: string }> {
  const section = parseSection((await params).section);
  if (!section) notFound();
  return { section, base: sectionBase(section) };
}

/**
 * For pages that exist only in the admin section (dashboard, staff, theme, …).
 * `/office/staff/dashboard` is a 404, not a second copy. The role check is the
 * page's own `requireAbility()`; this only keeps the URL space tidy.
 */
export async function adminSectionOnly(params: Promise<{ section: string }>) {
  const { section } = await getSection(params);
  if (section !== "admin") notFound();
}

/**
 * Where a Server Action should send the browser back to: the section the form
 * was posted from (its hidden `section` field). Missing or junk means staff,
 * the section both roles can open. Only ever a link prefix — never a check.
 */
export function formSectionBase(formData: FormData): string {
  return sectionBase(parseSection(formData.get("section")) ?? "staff");
}
