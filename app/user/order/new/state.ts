/**
 * Form state contract, kept out of actions.ts on purpose: a `"use server"`
 * module may only export async functions, so a plain object exported from
 * there would arrive as a server reference instead of a value.
 */

export type CreateOrderState = {
  /** Field name → error message. Empty when the submission was valid. */
  errors: Record<string, string>;
  message?: string;
};

export const emptyCreateOrderState: CreateOrderState = { errors: {} };
