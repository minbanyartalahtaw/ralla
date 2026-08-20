import { avatarDataUri } from "@/lib/avatar";
import { initials } from "@/lib/customers";
import { cn } from "@/lib/utils";

/**
 * A customer's chosen avatar, or the initials monogram when they don't have
 * one. `avatar` stores a catalogue id like `royal-f2`, picked on the
 * customer's own page — everywhere else just renders whichever applies.
 *
 * An id the catalogue doesn't know (hand-edited, or left over from an older
 * scheme) falls back to the monogram rather than breaking the row.
 *
 * Sizing is entirely the caller's — pass a `size-*` and text-size className
 * matching the spot this is used, same as the initials circles it replaces.
 */
export function CustomerAvatar({
  customer,
  className,
}: {
  customer: { name: string; avatar: string | null };
  className?: string;
}) {
  const src = customer.avatar ? avatarDataUri(customer.avatar) : null;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a data: URI, not a remote image next/image can optimize.
      <img
        src={src}
        alt=""
        className={cn("shrink-0 rounded-full bg-accent", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      {initials(customer.name)}
    </span>
  );
}
