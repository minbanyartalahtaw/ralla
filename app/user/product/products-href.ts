export type ProductsView = {
  query?: string;
  view?: "contact" | "table";
};

export function productsHref({ query, view }: ProductsView): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (view === "table") params.set("view", "table");
  const qs = params.toString();
  return qs ? `/user/product?${qs}` : "/user/product";
}
