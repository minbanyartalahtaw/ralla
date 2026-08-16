import { FlowerLoader } from "./_components/flower-loader";

// Covers every route under /user that doesn't have its own more specific
// loading.tsx — which right now is all of them, so this is the one loading
// state for the whole admin app. It nests inside layout.tsx, not around it:
// the sidebar and breadcrumb stay mounted and interactive while this shows.
export default function Loading() {
  return <FlowerLoader />;
}
