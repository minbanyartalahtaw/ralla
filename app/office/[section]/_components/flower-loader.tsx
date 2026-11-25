import { RallaMark } from "@/components/ralla-logo";

/**
 * The one loading state for the whole admin app — the sidebar's own mark
 * (see user-sidebar.tsx), spinning. Used both for whole-route loading
 * (app/user/loading.tsx) and for the dashboard's lazy-loaded charts, so a
 * page never shows two different ideas of "loading" at once.
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
      <RallaMark
        className={`animate-pulse text-primary motion-reduce:animate-none ${size === "lg" ? "size-14" : "size-8"}`}
      />
      {label ? (
        <p className="text-xs text-muted-foreground">{label}</p>
      ) : null}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
