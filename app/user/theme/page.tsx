/**
 * RALLA — theme & component reference.
 *
 * Every token in app/globals.css rendered once, so the palette can be reviewed
 * in one place. Nothing here is real data.
 *
 * Deliberately unlinked: no nav entry, no button, nowhere in the UI points at
 * it. Reachable only by typing `/user/theme`. It sits under `/user` so proxy.ts
 * still requires a session — a shop's customers have no business seeing the
 * component gallery, and staff have no reason to stumble into it either.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Clock01Icon,
  Download04Icon,
  InboxIcon,
  InformationCircleIcon,
  PlusSignIcon,
  Remove01Icon,
  Tick02Icon,
  TruckDeliveryIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { OrdersToolbar } from "./_components/orders-toolbar";

// ── Domain ────────────────────────────────────────────────────────────────────
// Single source of truth for delivery status. Never hand-type these strings at
// a call site — import the type.

const DELIVERY_STATUS = {
  pending: {
    label: "Pending",
    description: "Order received, not yet picked",
    chip: "bg-pending-soft text-pending",
    dot: "bg-pending",
  },
  packing: {
    label: "Packing",
    description: "Being picked and packed in store",
    chip: "bg-packing-soft text-packing",
    dot: "bg-packing",
  },
  shipped: {
    label: "Shipped",
    description: "Handed to the courier",
    chip: "bg-shipped-soft text-shipped",
    dot: "bg-shipped",
  },
  delivered: {
    label: "Delivered",
    description: "Confirmed received by customer",
    chip: "bg-delivered-soft text-delivered",
    dot: "bg-delivered",
  },
  cancelled: {
    label: "Cancelled",
    description: "Voided before dispatch",
    chip: "bg-cancelled-soft text-cancelled",
    dot: "bg-cancelled",
  },
} as const;

type DeliveryStatus = keyof typeof DELIVERY_STATUS;
type PaymentStatus = "paid" | "cod" | "refunded";

type Order = {
  id: string;
  customer: string;
  city: string;
  items: string;
  itemCount: number;
  /** Kyats, stored as an integer. Never a float. */
  total: number;
  payment: PaymentStatus;
  status: DeliveryStatus;
  placedAt: string;
};

const ORDERS: Order[] = [
  { id: "RL-10428", customer: "မသန္တာဝင်း", city: "Yangon", items: "Velvet Matte Lipstick × 2, Lip Liner", itemCount: 3, total: 48500, payment: "paid", status: "delivered", placedAt: "01 Aug" },
  { id: "RL-10427", customer: "ခင်မျိုးသူ", city: "Mandalay", items: "Glow Serum 30ml", itemCount: 1, total: 32000, payment: "cod", status: "shipped", placedAt: "02 Aug" },
  { id: "RL-10426", customer: "Nway Oo", city: "Yangon", items: "Cushion Foundation #21, Setting Powder", itemCount: 2, total: 76000, payment: "paid", status: "packing", placedAt: "02 Aug" },
  { id: "RL-10425", customer: "ဇင်မာလွင်", city: "Nay Pyi Taw", items: "Rose Blush Palette", itemCount: 1, total: 29500, payment: "cod", status: "pending", placedAt: "03 Aug" },
  { id: "RL-10424", customer: "Su Myat", city: "Mawlamyine", items: "Cleansing Balm, Toner 200ml, Cotton Pads", itemCount: 3, total: 54000, payment: "paid", status: "shipped", placedAt: "03 Aug" },
  { id: "RL-10423", customer: "ဧပြီဖြူ", city: "Yangon", items: "Matte Lipstick — Berry", itemCount: 1, total: 18500, payment: "refunded", status: "cancelled", placedAt: "03 Aug" },
  { id: "RL-10422", customer: "Thiri Aung", city: "Taunggyi", items: "Sunscreen SPF50 × 2", itemCount: 2, total: 41000, payment: "paid", status: "delivered", placedAt: "04 Aug" },
  { id: "RL-10421", customer: "မိုးပွင့်ဖြူ", city: "Pathein", items: "Brow Pencil, Mascara", itemCount: 2, total: 26500, payment: "cod", status: "pending", placedAt: "04 Aug" },
];

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid",
  cod: "COD",
  refunded: "Refunded",
};

const kyat = (n: number) => `${n.toLocaleString("en-US")} Ks`;

// ── Primitives ────────────────────────────────────────────────────────────────

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-[13px] font-semibold tracking-wide text-foreground">
          {title}
        </h2>
        {hint ? (
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      <div className="rounded-lg border bg-card">{children}</div>
    </section>
  );
}

function StatusChip({ status }: { status: DeliveryStatus }) {
  const s = DELIVERY_STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium ${s.chip}`}
    >
      <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}

function Swatch({
  name,
  hex,
  className,
  note,
  brand,
}: {
  name: string;
  hex: string;
  className: string;
  note: string;
  brand?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className={`h-14 ${className}`} />
      <div className="border-t bg-card px-2.5 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium text-foreground">{name}</span>
          {brand ? (
            <span className="shrink-0 text-[9px] font-semibold tracking-wide text-primary uppercase">
              Brand
            </span>
          ) : null}
        </div>
        <p className="numeric mt-0.5 font-mono text-[10px] text-muted-foreground uppercase">
          {hex}
        </p>
        <p className="mt-1 text-[10px] leading-[1.35] text-muted-foreground">
          {note}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  tone: "up" | "down" | "flat";
}) {
  const toneClass = {
    up: "text-delivered",
    down: "text-destructive",
    flat: "text-muted-foreground",
  }[tone];
  const toneIcon = {
    up: ArrowUp01Icon,
    down: ArrowDown01Icon,
    flat: Remove01Icon,
  }[tone];

  return (
    <div className="px-5 py-4 not-last:border-b sm:not-last:border-r sm:not-last:border-b-0">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="numeric mt-1.5 text-xl font-semibold tracking-tight">
        {value}
      </p>
      <p className={`numeric mt-1 flex items-center gap-1 text-[11px] ${toneClass}`}>
        <HugeiconsIcon icon={toneIcon} size={12} strokeWidth={2} />
        {delta}
      </p>
    </div>
  );
}

const ALERTS = [
  {
    icon: Tick02Icon,
    text: "12 orders were marked delivered.",
    cls: "bg-delivered-soft text-delivered border-delivered",
  },
  {
    icon: Clock01Icon,
    text: "4 orders have been pending for more than 48 hours.",
    cls: "bg-pending-soft text-pending border-pending",
  },
  {
    icon: Alert02Icon,
    text: "Courier sync failed. Last successful sync was 2 hours ago.",
    cls: "bg-destructive/10 text-destructive border-destructive",
  },
  {
    icon: InformationCircleIcon,
    text: "Scheduled maintenance on Sunday, 03:00–04:00.",
    cls: "bg-shipped-soft text-shipped border-shipped",
  },
];

const TIMELINE = [
  { status: "pending" as const, at: "02 Aug, 09:14", by: "System", done: true },
  { status: "packing" as const, at: "02 Aug, 11:02", by: "Su Su", done: true },
  { status: "shipped" as const, at: "03 Aug, 08:30", by: "Royal Express", done: true },
  { status: "delivered" as const, at: "Awaiting confirmation", by: "—", done: false },
];

const STATUS_KEYS = Object.keys(DELIVERY_STATUS) as DeliveryStatus[];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StyleGuide() {
  const th = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

  return (
    // No shell of its own: the /user layout already supplies the sidebar, the
    // top bar and the page padding.
    <div className="space-y-8">

          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Theme reference
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
              Every token defined in{" "}
              <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[11px]">
                app/globals.css
              </code>
              , rendered once. Nothing here hardcodes a color — add{" "}
              <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[11px]">
                .dark
              </code>{" "}
              to{" "}
              <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[11px]">
                &lt;html&gt;
              </code>{" "}
              to check the other theme.
            </p>
          </div>

          {/* ── Palette ──────────────────────────────────────────────────── */}
          <Section
            title="Brand ramp"
            hint="Five chosen colors, plus derived steps for hover states and depth. Components should reach for the semantic tokens below instead of these."
          >
            <div className="grid grid-cols-2 gap-2.5 p-5 sm:grid-cols-4 lg:grid-cols-5">
              <Swatch name="ralla-50" hex="#f9dbbd" className="bg-ralla-50" brand note="Peach. Warm surface, banners." />
              <Swatch name="ralla-100" hex="#ffa5ab" className="bg-ralla-100" brand note="Sidebar text, dark-mode accent." />
              <Swatch name="ralla-200" hex="#f28f98" className="bg-ralla-200" note="Derived. Dark-mode focus ring." />
              <Swatch name="ralla-300" hex="#da627d" className="bg-ralla-300" brand note="Fill and border only — 3.5:1." />
              <Swatch name="ralla-400" hex="#c44f6e" className="bg-ralla-400" note="Derived. Focus ring." />
              <Swatch name="ralla-500" hex="#b8436a" className="bg-ralla-500" note="Derived. Dark-mode primary." />
              <Swatch name="ralla-600" hex="#a53860" className="bg-ralla-600" brand note="Primary action — 6.3:1." />
              <Swatch name="ralla-700" hex="#8d2f52" className="bg-ralla-700" note="Derived. Pressed states." />
              <Swatch name="ralla-800" hex="#6a2340" className="bg-ralla-800" note="Derived. Deep surfaces." />
              <Swatch name="ralla-900" hex="#450920" className="bg-ralla-900" brand note="Foreground, sidebar — 16:1." />
            </div>

            <div className="grid gap-px border-t bg-border sm:grid-cols-2">
              <div className="bg-ralla-300 px-5 py-4">
                <p className="text-xs font-medium text-ralla-900">
                  #450920 on #da627d — 4.6:1, passes AA
                </p>
                <p className="mt-1 text-[11px] text-ralla-900/75">
                  The only safe way to set text on the mid pink.
                </p>
              </div>
              <div className="bg-ralla-300 px-5 py-4">
                <p className="text-xs font-medium text-white">
                  White on #da627d — 3.5:1, fails AA
                </p>
                <p className="mt-1 text-[11px] text-white/80">
                  Shown as the counter-example. Do not ship this pairing.
                </p>
              </div>
            </div>
          </Section>

          {/* ── Semantic tokens ──────────────────────────────────────────── */}
          <Section
            title="Semantic tokens"
            hint="What shadcn components actually read. These are the names to use in your markup."
          >
            <div className="grid grid-cols-2 gap-2.5 p-5 sm:grid-cols-4 lg:grid-cols-6">
              <Swatch name="background" hex="--background" className="bg-background" note="Page canvas." />
              <Swatch name="card" hex="--card" className="bg-card" note="Panels, tables, popovers." />
              <Swatch name="muted" hex="--muted" className="bg-muted" note="Table headers, code chips." />
              <Swatch name="accent" hex="--accent" className="bg-accent" note="Hover surfaces." />
              <Swatch name="primary" hex="--primary" className="bg-primary" note="Primary action." />
              <Swatch name="destructive" hex="--destructive" className="bg-destructive" note="Destructive only." />
              <Swatch name="border" hex="--border" className="bg-border" note="Dividers, outlines." />
              <Swatch name="ring" hex="--ring" className="bg-ring" note="Focus ring." />
              <Swatch name="sidebar" hex="--sidebar" className="bg-sidebar" note="Nav slab." />
              <Swatch name="chart-1" hex="--chart-1" className="bg-chart-1" note="Series 1 — brand." />
              <Swatch name="chart-2" hex="--chart-2" className="bg-chart-2" note="Series 2 — brand." />
              <Swatch name="chart-3" hex="--chart-3" className="bg-chart-3" note="Series 3 — off-hue." />
            </div>
          </Section>

          {/* ── Status ───────────────────────────────────────────────────── */}
          <Section
            title="Delivery status"
            hint="Held outside the berry hue family on purpose, so a delivery state can never be misread as brand chrome. Every color is paired with a label."
          >
            <table className="w-full text-xs">
              <tbody>
                {STATUS_KEYS.map((s) => (
                  <tr key={s} className="not-last:border-b">
                    <td className="w-40 px-5 py-2.5">
                      <StatusChip status={s} />
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {DELIVERY_STATUS[s].description}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-[11px] text-muted-foreground">
                      {s}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* ── Stats ────────────────────────────────────────────────────── */}
          <Section title="Summary metrics">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Orders today" value="24" delta="12% vs yesterday" tone="up" />
              <StatCard label="Revenue" value="1,284,000 Ks" delta="8.4% vs yesterday" tone="up" />
              <StatCard label="Out for delivery" value="17" delta="No change" tone="flat" />
              <StatCard label="Cancelled" value="3" delta="2 more this week" tone="down" />
            </div>
          </Section>

          {/* ── Buttons ──────────────────────────────────────────────────── */}
          <Section
            title="Buttons"
            hint="shadcn Button. Primary is berry; destructive is a true-red tinted variant with a warning icon, so the two can never be confused."
          >
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button>
                  <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />
                  Mark as shipped
                </Button>
                <Button variant="outline">
                  <HugeiconsIcon icon={Download04Icon} data-icon="inline-start" />
                  Export CSV
                </Button>
                <Button variant="secondary">Reassign courier</Button>
                <Button variant="ghost">View details</Button>
                <Button variant="destructive">
                  <HugeiconsIcon icon={Alert02Icon} data-icon="inline-start" />
                  Cancel order
                </Button>
                <Button variant="link">Order history</Button>
                <Button disabled>Disabled</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Button size="xs">Extra small</Button>
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" variant="outline" aria-label="Add order">
                  <HugeiconsIcon icon={PlusSignIcon} />
                </Button>
              </div>
            </div>
          </Section>

          {/* ── Orders table ─────────────────────────────────────────────── */}
          <Section
            title="Orders"
            hint="The core screen. No zebra striping — the row hover tint carries scanning instead."
          >
            <OrdersToolbar />

            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="w-9 pl-3">
                    <Checkbox aria-label="Select all orders" />
                  </TableHead>
                  <TableHead className={th}>Order</TableHead>
                  <TableHead className={th}>Customer</TableHead>
                  <TableHead className={th}>Items</TableHead>
                  <TableHead className={`${th} text-right`}>Total</TableHead>
                  <TableHead className={th}>Payment</TableHead>
                  <TableHead className={th}>Delivery</TableHead>
                  <TableHead className={th}>Placed</TableHead>
                  <TableHead className={th}>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ORDERS.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-3">
                      <Checkbox aria-label={`Select ${o.id}`} />
                    </TableCell>
                    <TableCell>
                      <span className="numeric font-mono text-[11px] font-medium">
                        {o.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{o.customer}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {o.city}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <div className="truncate text-muted-foreground" title={o.items}>
                        {o.items}
                      </div>
                      <div className="numeric text-[11px] text-muted-foreground">
                        {o.itemCount} items
                      </div>
                    </TableCell>
                    <TableCell className="numeric text-right font-medium">
                      {kyat(o.total)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          o.payment === "refunded"
                            ? "font-medium text-destructive"
                            : "text-muted-foreground"
                        }
                      >
                        {PAYMENT_LABEL[o.payment]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={o.status} />
                    </TableCell>
                    <TableCell className="numeric text-muted-foreground">
                      {o.placedAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="xs">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between gap-3 border-t px-5 py-2.5">
              <p className="numeric text-[11px] text-muted-foreground">
                Showing 1–8 of 142 orders
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon-xs" aria-label="Previous page">
                  <HugeiconsIcon icon={ArrowLeft01Icon} />
                </Button>
                <Button size="icon-xs" className="numeric">
                  1
                </Button>
                <Button variant="ghost" size="icon-xs" className="numeric">
                  2
                </Button>
                <Button variant="ghost" size="icon-xs" className="numeric">
                  3
                </Button>
                <Button variant="outline" size="icon-xs" aria-label="Next page">
                  <HugeiconsIcon icon={ArrowRight01Icon} />
                </Button>
              </div>
            </div>
          </Section>

          {/* ── Timeline ─────────────────────────────────────────────────── */}
          <Section
            title="Delivery timeline"
            hint="Order detail view — status history for RL-10427."
          >
            <ol className="p-5">
              {TIMELINE.map((step, i) => (
                <li key={step.status} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 size-2 shrink-0 rounded-full ${
                        step.done ? DELIVERY_STATUS[step.status].dot : "bg-border"
                      }`}
                    />
                    {i < TIMELINE.length - 1 ? (
                      <span className="w-px flex-1 bg-border" />
                    ) : null}
                  </div>
                  <div className={`pb-5 ${step.done ? "" : "opacity-50"}`}>
                    <p className="text-xs font-medium">
                      {DELIVERY_STATUS[step.status].label}
                    </p>
                    <p className="numeric text-[11px] text-muted-foreground">
                      {step.at} · {step.by}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {/* ── Forms ────────────────────────────────────────────────────── */}
          <Section
            title="Form controls"
            hint="shadcn Input, Textarea and Checkbox. Invalid state is driven by aria-invalid — the component styles itself, no extra classes needed. Radio is still a plain input until you add the shadcn one."
          >
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <label htmlFor="customer" className="mb-1 block text-[11px] font-medium">
                  Customer name
                </label>
                <Input id="customer" placeholder="မသန္တာဝင်း" />
              </div>

              <div>
                <label htmlFor="tracking" className="mb-1 block text-[11px] font-medium">
                  Tracking number
                </label>
                <InputGroup>
                  <InputGroupAddon>
                    <HugeiconsIcon icon={TruckDeliveryIcon} strokeWidth={1.5} />
                  </InputGroupAddon>
                  <InputGroupInput id="tracking" placeholder="RE-000000" />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>Royal Express</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="note" className="mb-1 block text-[11px] font-medium">
                  Delivery note
                </label>
                <Textarea
                  id="note"
                  placeholder="Building 3, 2nd floor. Call on arrival."
                />
              </div>

              <div>
                <label htmlFor="total" className="mb-1 block text-[11px] font-medium">
                  Total (Ks)
                </label>
                <Input
                  id="total"
                  className="numeric"
                  defaultValue="0"
                  aria-invalid
                  aria-describedby="total-error"
                />
                <span
                  id="total-error"
                  className="mt-1 flex items-center gap-1 text-[11px] text-destructive"
                >
                  <HugeiconsIcon icon={Alert02Icon} size={12} strokeWidth={2} />
                  Must be greater than 0.
                </span>
              </div>

              <fieldset>
                <legend className="mb-1 text-[11px] font-medium">Payment</legend>
                <div className="space-y-1.5">
                  {(["paid", "cod", "refunded"] as PaymentStatus[]).map((p) => (
                    <label
                      key={p}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <input
                        type="radio"
                        name="payment"
                        defaultChecked={p === "cod"}
                        className="size-3.5 accent-[var(--primary)]"
                      />
                      {PAYMENT_LABEL[p]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2 sm:col-span-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox defaultChecked />
                  Notify customer by SMS when the delivery status changes
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox />
                  Require signature on delivery
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox disabled />
                  Split shipment (unavailable for COD)
                </label>
              </div>
            </div>
          </Section>

          {/* ── Alerts ───────────────────────────────────────────────────── */}
          <Section
            title="Alerts"
            hint="Reuse the status tokens. No alert introduces a new color."
          >
            <div className="space-y-2 p-5">
              {ALERTS.map((a) => (
                <div
                  key={a.text}
                  className={`flex items-start gap-2.5 rounded-md border-l-2 px-4 py-2.5 ${a.cls}`}
                >
                  <span className="mt-px shrink-0">
                    <HugeiconsIcon icon={a.icon} size={14} strokeWidth={1.5} />
                  </span>
                  <p className="text-xs font-medium">{a.text}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Typography ───────────────────────────────────────────────── */}
          <Section
            title="Typography"
            hint="Inter for UI, Geist Mono with tabular figures for IDs and money."
          >
            <dl className="divide-y">
              {[
                { k: "Page title", v: <p className="text-xl font-semibold tracking-tight">Order RL-10427</p> },
                { k: "Section", v: <p className="text-[13px] font-semibold tracking-wide">Delivery details</p> },
                { k: "Body", v: <p className="text-xs leading-5">The customer is notified automatically whenever the delivery status changes.</p> },
                { k: "Body (Burmese)", v: <p className="text-xs leading-6">အော်ဒါ အခြေအနေ ပြောင်းလဲပါက ဝယ်ယူသူထံ အလိုအလျောက် အကြောင်းကြားပါမည်။</p> },
                { k: "Muted", v: <p className="text-xs text-muted-foreground">Secondary information and helper text.</p> },
                { k: "Numeric", v: <p className="numeric font-mono text-xs">1,284,000 Ks · RL-10427 · 2026-08-04</p> },
              ].map((row) => (
                <div
                  key={row.k}
                  className="grid gap-1 px-5 py-3 sm:grid-cols-[160px_1fr] sm:gap-4"
                >
                  <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {row.k}
                  </dt>
                  <dd className="min-w-0">{row.v}</dd>
                </div>
              ))}
            </dl>
          </Section>

          {/* ── Empty state ──────────────────────────────────────────────── */}
          <Section title="Empty state">
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="text-muted-foreground">
                <HugeiconsIcon icon={InboxIcon} size={32} strokeWidth={1.5} />
              </span>
              <p className="mt-3 text-xs font-medium">No cancelled orders</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Nothing was cancelled in the selected date range.
              </p>
              <Button variant="outline" className="mt-4">
                Clear filters
              </Button>
            </div>
          </Section>
    </div>
  );
}
