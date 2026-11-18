export type ProductsView = {
  query?: string;
  view?: "contact" | "table";
  /** `stock`, `price`, or either with a leading `-` for descending. */
  sort?: string;
};

export function productsHref({ query, view, sort }: ProductsView): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (view === "table") params.set("view", "table");
  if (sort) params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/user/product?${qs}` : "/user/product";
}
