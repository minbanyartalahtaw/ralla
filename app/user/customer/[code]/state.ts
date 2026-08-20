/**
 * Return shape of updateCustomerAction, kept out of actions.ts: a
 * `"use server"` module may only export async functions, so a plain type
 * export from there would arrive as a server reference instead of a value.
 */

export type UpdateCustomerState = {
  /** Field name → error message. Empty when the submission was valid. */
  errors: Record<string, string>;
  message?: string;
  ok: boolean;
};
