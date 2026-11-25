export type ProductsView = {
  query?: string;
  view?: "contact" | "table";
  /** `stock`, `price`, or either with a leading `-` for descending. */
  sort?: string;
};

export function productsHref(base: string, { query, view, sort }: ProductsView): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (view === "table") params.set("view", "table");
  if (sort) params.set("sort", sort);
  const qs = params.toString();
  return qs ? `${base}/product?${qs}` : `${base}/product`;
}
