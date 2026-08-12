/**
 * Form state contract, kept out of actions.ts: a `"use server"` module may only
 * export async functions, so a plain object exported from there would arrive as
 * a server reference instead of a value.
 */

export type LoginState = {
  /** Shown above the field. Absent before the first attempt. */
  error?: string;
};

export const emptyLoginState: LoginState = {};
