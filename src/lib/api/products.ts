import { api } from "@/lib/api/client";
import type { ProductDTO, ProductResponse } from "@/lib/api/types";

const PAGE_SIZE = 100;

export async function fetchAllProducts(signal?: AbortSignal): Promise<ProductDTO[]> {
  const all: ProductDTO[] = [];
  for (let page = 0; page < 50; page++) {
    const res = await api<ProductResponse>("/api/public/products", {
      auth: false,
      signal,
      query: { pageNumber: page, pageSize: PAGE_SIZE, sortBy: "productId", sortOrder: "asc" },
    });
    all.push(...(res.content ?? []));
    if (res.lastPage || !res.content?.length) break;
  }
  return all;
}
