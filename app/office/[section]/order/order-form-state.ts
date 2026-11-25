/**
 * Form state contract for the order form, shared by the new and edit routes.
 *
 * Kept out of the action modules on purpose: a `"use server"` module may only
 * export async functions, so a plain object exported from there would arrive as
 * a server reference instead of a value.
 */

export type OrderFormState = {
  /** Field name → error message. Empty when the submission was valid. */
  errors: Record<string, string>;
  message?: string;
};

export const emptyOrderFormState: OrderFormState = { errors: {} };

/**
 * What `useActionState` hands the form. Both routes' actions have this shape,
 * which is what lets one form component serve either.
 */
export type OrderFormAction = (
  state: OrderFormState,
  formData: FormData,
) => Promise<OrderFormState>;
