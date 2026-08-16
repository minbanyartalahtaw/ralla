/**
 * The one loading state for the whole admin app — the sidebar's own mark
 * (see user-sidebar.tsx), swaying like a stem in a breeze rather than a
 * spinner. Used both for whole-route loading (app/user/loading.tsx) and for
 * the dashboard's lazy-loaded charts, so a page never shows two different
 * ideas of "loading" at once.
 */
export function FlowerLoader({
  label,
  size = "lg",
}: {
  label?: string;
  size?: "sm" | "lg";
}) {
  return (
    <div
      className={
        size === "lg"
          ? "flex flex-1 flex-col items-center justify-center gap-3 py-24"
          : "flex flex-col items-center justify-center gap-2 py-10"
      }
    >
      <span
        className={`relative flex items-end justify-center ${
          size === "lg" ? "size-16" : "size-8"
        }`}
      >
        <span
          className="animate-flower-glow absolute inset-[16%] rounded-full bg-primary/40 blur-[2px]"
          aria-hidden
        />
        <span
          className={`animate-flower-sway relative ${
            size === "lg" ? "text-5xl" : "text-2xl"
          }`}
          aria-hidden
        >
          🌸
        </span>
      </span>
      {label ? (
        <p className="text-xs text-muted-foreground">{label}</p>
      ) : null}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
