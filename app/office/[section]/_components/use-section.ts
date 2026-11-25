"use client";

import { useParams } from "next/navigation";

import { parseSection, sectionBase, type Section } from "@/lib/permissions";

/** Client twin of getSection(): the section this page is in, from the URL. */
export function useSection(): { section: Section; base: string } {
  const section = parseSection(useParams<{ section: string }>().section) ?? "staff";
  return { section, base: sectionBase(section) };
}
