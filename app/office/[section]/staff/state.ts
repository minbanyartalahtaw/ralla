/**
 * Form state contract, kept out of actions.ts: a `"use server"` module may only
 * export async functions.
 */

export type StaffFormState = {
  /** Field name → error message (add form only). */
  errors: Record<string, string>;
  /** A refusal that belongs to no one field, e.g. "last active admin". */
  message?: string;
  /** Success text; the form toasts it. */
  ok?: string;
};

export const emptyStaffFormState: StaffFormState = { errors: {} };
