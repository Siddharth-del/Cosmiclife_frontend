import { createContext, useContext, type ReactNode } from "react";
import type { Product } from "@/types";

const CatalogContext = createContext<Product[]>([]);

export function CatalogProvider({ products, children }: { products: Product[]; children: ReactNode }) {
  return <CatalogContext.Provider value={products}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => useContext(CatalogContext);
