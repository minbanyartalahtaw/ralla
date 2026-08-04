/**
 * Product persistence.
 *
 * Server-only — never import this from a Client Component.
 */

import { prisma } from "@/lib/prisma";
import type { ProductModel } from "@/generated/prisma/models";

export type Product = ProductModel;

/** Everything the order form's product picker needs. */
export async function listActiveProducts(): Promise<Product[]> {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function listProducts(): Promise<Product[]> {
  return prisma.product.findMany({ orderBy: { name: "asc" } });
}

export async function getProduct(id: number): Promise<Product | null> {
  return prisma.product.findUnique({ where: { id } });
}
