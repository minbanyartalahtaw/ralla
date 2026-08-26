/**
 * Customer domain.
 *
 * `id` is the identity and the only thing other records point at. Everything
 * staff see — `code`, name, phone — is either displayed or editable, so none
 * of it is safe to key on.
 *
 * The Customer shape comes from the Prisma schema. Safe to import from both
 * server and client — persistence lives in lib/customer-store.ts.
 */

import type { CustomerModel } from "@/generated/prisma/models";

/** The row shape Prisma returns. Aliased so app code reads naturally. */
export type Customer = CustomerModel;

/**
 * Everything the create form supplies. The rest is assigned by the database.
 * `avatar` is excluded too — it's never part of the Details form, only set
 * through the avatar picker on the customer's own page. See updateCustomerAvatar().
 */
export type NewCustomer = Omit<
  Customer,
  "id" | "code" | "createdAt" | "updatedAt" | "avatar"
>;

/**
 * Up to two initials, for the avatar that stands in for a customer.
 *
 * Staff recognise a customer by face, and a record has none — a monogram at
 * least gives the row something to be recognised by, and the same one every
 * time. Uses Intl.Segmenter so a Burmese name yields whole
 * characters: those scripts combine several code points into one glyph, and
 * slicing by code unit would print half a letter.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (words.length === 0) return "?";

  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return words
    .map((word) => {
      const [first] = segmenter.segment(word);
      return (first?.segment ?? "").toUpperCase();
    })
    .join("");
}
