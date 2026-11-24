import { api } from "@/lib/api/client";
import { categorySlug } from "@/lib/api/categories";
import type { ProductTypeDTO, ProductTypeInput } from "@/lib/api/types";

export interface RawProductType {
  productTypeId?: number | null;
  productTypeName?: string | null;
  name?: string | null;
  slug?: string | null;
  displayOrder?: number | string | null;
  sortOrder?: number | null;
  active?: boolean | null;
  categoryId?: number | null;
  categoryName?: string | null;
  category?: { categoryId?: number | null; categoryName?: string | null; name?: string | null } | null;
  productCount?: number | null;
}

export function normaliseProductType(raw: RawProductType): ProductTypeDTO {
  const name = (raw.productTypeName ?? raw.name ?? "").trim();
  const order = Number(raw.displayOrder ?? raw.sortOrder ?? 0);
  return {
    productTypeId: raw.productTypeId ?? 0,
    name,
    slug: raw.slug?.trim() || categorySlug(name),
    displayOrder: Number.isFinite(order) ? order : 0,
    active: raw.active ?? true,
    categoryId: raw.categoryId ?? raw.category?.categoryId ?? null,
    categoryName: raw.categoryName ?? raw.category?.categoryName ?? raw.category?.name ?? null,
    productCount: raw.productCount ?? null,
  };
}

export const toProductTypeBody = (t: ProductTypeInput) => ({
  productTypeName: t.name,
  name: t.name,
  slug: t.slug,
  displayOrder: t.displayOrder,
  active: t.active,
  categoryId: t.categoryId,
});

interface RawProductTypePage {
  content?: RawProductType[] | null;
}

export const byTypeOrder = (a: ProductTypeDTO, b: ProductTypeDTO) =>
  a.displayOrder - b.displayOrder || a.name.localeCompare(b.name);

export const PRODUCT_TYPE_LIST = "/api/public/product-Type";
export const productTypeAdminPath = (id: number | string) => `/api/admin/product-Type/${id}`;
export const productTypeCreatePath = (categoryId: number | string) => `/api/admin/categories/${categoryId}/product-Type`;

export async function fetchProductTypePage(
  auth: boolean,
  query: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
): Promise<ProductTypeDTO[]> {
  const res = await api<RawProductTypePage | RawProductType[]>(PRODUCT_TYPE_LIST, {
    auth,
    signal,
    query: { pageNumber: 0, pageSize: 200, ...query },
  });
  const list = Array.isArray(res) ? res : (res?.content ?? []);
  return list.map(normaliseProductType).filter((t) => t.productTypeId > 0 && !!t.name).sort(byTypeOrder);
}

export async function fetchProductTypes(categoryId?: number, signal?: AbortSignal): Promise<ProductTypeDTO[]> {
  const all = (await fetchProductTypePage(false, {}, signal)).filter((t) => t.active);
  if (categoryId == null) return all;
  return all.filter((t) => t.categoryId === categoryId);
}
