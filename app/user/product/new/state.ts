/**
 * Form state contract, kept out of actions.ts: a `"use server"` module may only
 * export async functions, so a plain object exported from there would arrive as
 * a server reference instead of a value.
 */

export type CreateProductState = {
  /** Field name → error message. Empty when the submission was valid. */
  errors: Record<string, string>;
  /** Set once the product is stored, so the form can confirm it. */
  created?: { sku: string; name: string };
  message?: string;
};

export const emptyCreateProductState: CreateProductState = { errors: {} };
