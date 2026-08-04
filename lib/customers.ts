/**
 * Customer domain.
 *
 * `id` is the identity. A TikTok handle can be renamed by its owner at any
 * time, so it is a *mutable lookup key*, never the thing other records point
 * at: unique among customers and the fastest way for staff to find someone,
 * but it can change without the customer changing.
 *
 * Anything that needs to reference a customer must store `id`.
 *
 * Safe to import from both server and client. Persistence lives in
 * lib/customer-store.ts and must never be imported from a Client Component.
 */

export type Customer = {
  /** Permanent identity. Never reused, never changes. */
  id: string;
  /**
   * Normalized: lowercase, no leading `@`. Unique across customers, but the
   * customer may rename it — treat as a lookup index, not an identifier.
   */
  tiktokUsername: string;
  /**
   * The display name on their TikTok profile — what staff actually see in
   * comments and DMs. Free text, not unique, and often nothing like their real
   * name. Optional: the handle already identifies them.
   */
  tiktokName: string;
  /** The customer's real name, for the delivery label. */
  name: string;
  phone: string;
  city: string;
  address: string;
  note: string;
  createdAt: string;
};

/** Everything the create form supplies. The rest is assigned by the server. */
export type NewCustomer = Omit<Customer, "id" | "createdAt">;

/**
 * Accepts anything staff might paste: `@name`, `name`, or a full profile URL
 * like `https://www.tiktok.com/@name?lang=en`. Returns the bare handle.
 */
export function normalizeTiktokUsername(raw: string): string {
  let value = raw.trim();

  // Pull the handle out of a pasted profile URL.
  const urlMatch = value.match(/tiktok\.com\/@([^/?#\s]+)/i);
  if (urlMatch) value = urlMatch[1];

  return value.replace(/^@+/, "").trim().toLowerCase();
}

/** TikTok allows letters, digits, underscore and period; 2–24 characters. */
export function isValidTiktokUsername(handle: string): boolean {
  return /^[a-z0-9._]{2,24}$/.test(handle);
}

/** Display form — always with the `@`, so it reads as a handle. */
export function formatTiktokHandle(handle: string): string {
  return `@${handle}`;
}
