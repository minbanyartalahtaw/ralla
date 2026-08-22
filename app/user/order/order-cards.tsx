import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Note01Icon } from "@hugeicons/core-free-icons";

import {
  PAYMENT_METHOD,
  formatDate,
  formatKyat,
  itemCount,
  type OrderWithItems,
} from "@/lib/orders";

import { StatusSelect } from "./status-select";

/**
 * The card layout for the orders list — the default view.
 *
 * One card per order: code, note flag and status chip up top; then three
 * label/value rows — customer and date, city and phone, items and total —
 * that the table shows but the original card dropped. Those are exactly what
 * staff need to read at a glance without opening the order.
 *
 * Every row below the first is `flex-1` text on the left and a `shrink-0`
 * figure on the right, so the totals, phone numbers and dates all land on one
 * flush right edge — a column of ragged right-hand values was the thing that
 * made the card look busy. Nothing floats between them: no icon prefixes (two
 * small icons next to two short strings read as clutter on a phone-width
 * card) and no hover chevron, which would have taken width on one row only
 * and broken that edge; the card's hover border and tint already say it's a
 * link. A consistent `mt-2` rhythm does the grouping, and the item row sits a
 * shade dimmer so it reads as the least important line rather than competing.
 * Semantic tokens throughout (`bg-card`, `text-muted-foreground`), so
 * light/dark mode comes for free.
 *
 * The card is *not* one big `<Link>`, because the status chip is the same
 * clickable `StatusSelect` the table uses and a `<button>` can't live inside
 * an `<a>`. Instead the link is a transparent overlay stretched across the
 * card, and the chip sits above it — so clicking anywhere else opens the
 * order, and clicking the chip changes the status without navigating. Like
 * the table, the link addresses the order by `code`, not `id`.
 *
 * `relative` and nothing more is what lifts the chip: positioned siblings at
 * the same z-index paint in DOM order, and the chip already comes after the
 * overlay. It must *not* be given a `z-10` — the sticky page header is also
 * `z-10`, and a card that ties with it wins on DOM order, so the chip scrolls
 * out over the header instead of under it.
 *
 * The overlay covers the text, which is what costs the item list its hover
 * tooltip — the full names live on the detail page, one click away. The note
 * icon is lifted above the overlay instead: its tooltip *is* the note, and a
 * 12px dead spot is a cheap price for still being able to read one without
 * opening the order.
 */
export function OrderCards({ orders }: { orders: OrderWithItems[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {orders.map((o) => {
        const itemNames = o.items.map((i) => i.name).join(", ");

        return (
          <li
            key={o.id}
            // `focus-within` rather than `focus-visible`: the thing being
            // focused is the overlay link inside, not the card itself, so the
            // card has to react to focus landing anywhere in it.
            className="relative rounded-lg border bg-card p-4 transition-colors focus-within:border-primary/40 hover:border-primary/40 hover:bg-accent/40"
          >
            {/* The whole-card hit area. Empty and absolutely positioned: it
                carries no text of its own, so the accessible name has to come
                from `aria-label`. */}
            <Link
              href={`/user/order/${o.code}`}
              aria-label={`View details for order ${o.code}`}
              className="absolute inset-0 rounded-lg focus-visible:outline-none"
            />

            {/* Line 1: code + note flag, status chip at the far end. */}
            <div className="flex items-center gap-2">
              <span className="numeric min-w-0 truncate font-mono text-sm font-semibold">
                {o.code}
              </span>
              {o.note ? (
                <HugeiconsIcon
                  icon={Note01Icon}
                  size={12}
                  strokeWidth={2}
                  className="relative shrink-0 text-muted-foreground"
                  aria-label={`Note: ${o.note}`}
                >
                  <title>{o.note}</title>
                </HugeiconsIcon>
              ) : null}
              <div className="relative ms-auto shrink-0">
                <StatusSelect orderId={o.id} code={o.code} status={o.status} />
              </div>
            </div>

            {/* Line 2: who ordered, and when. The date is muted and
                unweighted — it shares the row with the customer name but
                shouldn't compete with it for the eye. */}
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">
                {o.customerName}
              </span>
              <span className="numeric shrink-0 font-mono text-xs text-muted-foreground">
                {formatDate(o.placedAt)}
              </span>
            </div>

            {/* Line 3: where it's going and how to reach them — the two
                things a delivery run actually needs. */}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="min-w-0 flex-1 truncate">{o.city}</span>
              <span className="numeric shrink-0">{o.phone}</span>
            </div>

            {/* Line 4: what's in the order, what it came to, and payment
                when it's the unusual case (refunded) worth flagging
                without a click. The item list is the dimmest thing on the
                card, but the total keeps full contrast and weight — it
                sits on this row for the right-edge alignment, not because
                it's the least important figure here. */}
            <div className="mt-2 flex items-baseline gap-2 text-[11px] text-muted-foreground/70">
              <span className="min-w-0 flex-1 truncate">
                {itemNames}
                <span className="numeric"> · {itemCount(o.items)}</span>
              </span>
              <span className="numeric shrink-0 font-mono text-sm font-medium text-foreground">
                {formatKyat(o.total)}
              </span>
              {o.paymentMethod === "refunded" ? (
                <span className="shrink-0 font-medium text-destructive">
                  {PAYMENT_METHOD[o.paymentMethod]}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
