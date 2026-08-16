"use client";

import dynamic from "next/dynamic";

import type { LabelledCount, RevenueDay } from "@/lib/orders";

import { FlowerLoader } from "../_components/flower-loader";

// recharts is a heavy client-only dependency (~110KB gzipped) that isn't
// needed until the dashboard's own data has already streamed in. Splitting it
// into its own on-demand chunk keeps it off the page's initial JS — that
// initial payload is what actually blocks the main thread on a cold PWA open,
// since /user/dashboard is the manifest's start_url.
export const RevenueChart = dynamic<{ data: RevenueDay[] }>(
  () => import("./revenue-chart").then((m) => m.RevenueChart),
  { ssr: false, loading: () => <FlowerLoader size="sm" /> },
);

export const OrdersChart = dynamic<{ data: RevenueDay[] }>(
  () => import("./orders-chart").then((m) => m.OrdersChart),
  { ssr: false, loading: () => <FlowerLoader size="sm" /> },
);

export const BreakdownChart = dynamic<{
  data: LabelledCount[];
  unit: string;
}>(() => import("./breakdown-chart").then((m) => m.BreakdownChart), {
  ssr: false,
  loading: () => <FlowerLoader size="sm" />,
});
