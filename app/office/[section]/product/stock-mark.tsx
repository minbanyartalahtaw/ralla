/** Staff see this many units or fewer marked "Low". One number, easy to change. */
export const LOW_STOCK = 5;

/**
 * How many are left, in words, for the read-only product screen. Plain text,
 * never a pill: a soft pill with a dot is a delivery status, and amber would
 * read as "shipped" in that shape. Grey for none matches the order picker.
 */
export function StockMark({ stock }: { stock: number }) {
  if (stock === 0) {
    return <span className="text-[11px] font-medium text-cancelled">Out of stock</span>;
  }
  if (stock <= LOW_STOCK) {
    return (
      <span className="numeric text-[11px] font-semibold text-shipped">Low · {stock} left</span>
    );
  }
  return <span className="numeric text-[11px] text-muted-foreground">{stock} left</span>;
}
