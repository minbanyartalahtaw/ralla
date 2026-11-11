/**
 * Form state contract, kept out of actions.ts: a `"use server"` module may only
 * export async functions.
 */

export type SettingsFormState = {
  /** Field name → error message. */
  errors: Record<string, string>;
  message?: string;
  /** True after a successful save; the form shows a toast. */
  ok?: boolean;
};

export const emptySettingsFormState: SettingsFormState = { errors: {} };
