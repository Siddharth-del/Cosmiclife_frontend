import { api } from "@/lib/api/client";
import type { CategoryDTO, CategoryInput, CategoryTheme } from "@/lib/api/types";

export interface RawCategory {
  categoryId?: number | null;
  categoryName?: string | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  iconImage?: string | null;
  icon?: string | null;
  image?: string | null;
  active?: boolean | null;
  theme?: string | null;
  sortOrder?: number | null;
  legacyCode?: string | null;
  productCount?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export const categorySlug = (raw: string) =>
  (raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

export function legacyCodeFor(name: string): string | null {
  const key = (name ?? "").trim().toLowerCase();
  if (key.startsWith("handicraft")) return "HANDICRAFT";
  if (key.startsWith("attar")) return "ATTAR";
  if (key.startsWith("perfume")) return "PERFUME";
  return null;
}

export function normaliseCategory(raw: RawCategory): CategoryDTO {
  const name = (raw.categoryName ?? raw.name ?? "").trim();
  const theme: CategoryTheme = raw.theme === "dark" ? "dark" : "light";
  return {
    categoryId: raw.categoryId ?? 0,
    name,
    slug: raw.slug?.trim() || categorySlug(name),
    description: raw.description ?? null,
    imageUrl: raw.iconImage ?? raw.imageUrl ?? raw.icon ?? raw.image ?? null,
    active: raw.active ?? true,
    theme,
    sortOrder: raw.sortOrder ?? 0,
    legacyCode: raw.legacyCode ?? legacyCodeFor(name),
    productCount: raw.productCount ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

export const toCategoryBody = (c: CategoryInput) => ({
  ...c,
  categoryName: c.name,
  iconImage: c.imageUrl ?? undefined,
});

interface RawCategoryPage {
  content?: RawCategory[] | null;
}

export async function fetchCategoryPage(auth: boolean, signal?: AbortSignal): Promise<CategoryDTO[]> {
  const res = await api<RawCategoryPage | RawCategory[]>("/api/public/categories", {
    auth,
    signal,
    query: { pageNumber: 0, pageSize: 100, sortBy: "categoryId", sortOrder: "asc" },
  });
  const list = Array.isArray(res) ? res : (res?.content ?? []);
  return list.map(normaliseCategory);
}

export function fetchCategories(signal?: AbortSignal): Promise<CategoryDTO[]> {
  return fetchCategoryPage(false, signal);
}
