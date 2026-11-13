import { categories as allCategories, collections } from "@/data/collections";
import { journal } from "@/data/journal";
import { testimonials } from "@/data/testimonials";
import { fetchAllProducts } from "@/lib/api/products";
import { fetchCategories } from "@/lib/api/categories";
import { bannerIsLive, byDisplayOrder, emptyBannerMap, fetchBanners } from "@/lib/api/banners";
import { fetchProductTypes } from "@/lib/api/productTypes";
import { BANNER_PLACEMENTS, fromMinorUnits, rupees, type BannerMap, type CategoryDTO, type ProductTypeDTO, type FragranceFamilyEnum, type MaterialEnum, type ProductDTO } from "@/lib/api/types";
import { isIntl } from "@/lib/market";
import type { Category, Collection, Material, Product, ProductImage, ProductType, ScentFamily } from "@/types";

export const familyLabel = (f: FragranceFamilyEnum | ScentFamily | null | undefined) => (f ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : "");

export function optimisedImage(url: string, width = 1200): string {
  const m = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/);
  return m ? `${m[1]}f_auto,q_auto,c_limit,w_${width}/${m[2]}` : url;
}

const isUsableImage = (src: string | null | undefined): src is string => !!src && /^(https?:)?\/\//i.test(src.trim());

function gallery(d: ProductDTO): ProductImage[] {
  const urls: string[] = [];
  const add = (raw: string | null | undefined) => {
    if (!isUsableImage(raw)) return;
    const src = raw.trim();
    if (!urls.includes(src)) urls.push(src);
  };
  add(d.image);
  for (const img of [...(d.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)) add(img.imageUrl);
  return urls.map((src, i) => ({
    src: optimisedImage(src),
    alt: i === 0 ? d.name : `${d.name} — view ${i + 1}`,
    width: 1000,
    height: 1250,
  }));
}

export function productWorld(d: Pick<ProductDTO, "category" | "fragranceFamily" | "categoryName">): ProductType {
  if (d.category === "ATTAR") return "attar";
  if (d.category === "PERFUME") return "perfume";
  if (d.category === "HANDICRAFT") return "handicraft";
  if (d.categoryName?.trim()) return "other";
  return d.fragranceFamily ? "perfume" : "handicraft";
}

export const materials: { slug: Material; label: string; value: MaterialEnum }[] = [
  { slug: "brass", label: "Brass", value: "BRASS" },
  { slug: "copper", label: "Copper", value: "COPPER" },
  { slug: "others", label: "Others", value: "OTHERS" },
];

export function productMaterial(d: Pick<ProductDTO, "category" | "fragranceFamily" | "categoryName" | "material">): Material | undefined {
  if (productWorld(d) !== "handicraft") return undefined;
  return materials.find((m) => m.value === d.material)?.slug ?? "others";
}

export const materialLabel = (m: Material | undefined) => materials.find((x) => x.slug === m)?.label ?? "";

export const isFragrance = (p: Pick<Product, "type">) => p.type === "attar" || p.type === "perfume";

export function toProduct(d: ProductDTO): Product {
  const price = isIntl ? fromMinorUnits(d.priceUsd) : rupees(d.price);
  const mrp = isIntl ? fromMinorUnits(d.mrpUsd) : rupees(d.mrp);
  const stock = d.stock ?? 0;
  const active = d.active !== false;
  const type = productWorld(d);
  return {
    id: String(d.productId),
    productId: d.productId,
    slug: d.slug || `product-${d.productId}`,
    name: d.name,
    type,
    world: type,
    categoryId: d.categoryId ?? undefined,
    categorySlug: d.categorySlug ?? undefined,
    categoryName: d.categoryName ?? undefined,
    productTypeId: d.productTypeId ?? undefined,
    productTypeName: d.productTypeName ?? undefined,
    material: productMaterial(d),
    gender: d.gender === "MEN" ? "him" : d.gender === "WOMEN" ? "her" : "unisex",
    family: familyLabel(d.fragranceFamily),
    families: d.fragranceFamily ? [d.fragranceFamily.toLowerCase() as ScentFamily] : [],
    description: d.description ?? "",
    variants: [{ id: String(d.productId), size: "", price, compareAt: mrp > price ? mrp : undefined, inStock: active && stock > 0 }],
    images: gallery(d),
    stock,
    active,
    discount: (isIntl ? d.discountUsd : d.discount) ?? 0,
    badges: [],
  };
}

const TTL = 60_000;

const CATEGORY_FALLBACK_IMAGE = "/images/campaign/lineup.webp";

let categoryCache: { at: number; promise: Promise<CategoryDTO[]> } | null = null;

const ABSENT_TTL = 10 * 60_000;

function markAbsent(key: string) {
  try {
    localStorage.setItem(`cl:absent:${key}`, String(Date.now()));
  } catch {
    return;
  }
}

function isAbsent(key: string): boolean {
  try {
    const at = Number(localStorage.getItem(`cl:absent:${key}`));
    return !!at && Date.now() - at < ABSENT_TTL;
  } catch {
    return false;
  }
}

function endpointMissing(e: unknown): boolean {
  const status = (e as { httpStatus?: number; status?: number } | null)?.httpStatus ?? (e as { status?: number } | null)?.status;
  return status === 401 || status === 403 || status === 404 || status === 405;
}

export function getApiCategories(): Promise<CategoryDTO[]> {
  if (isAbsent("categories")) return Promise.resolve([]);
  if (!categoryCache || Date.now() - categoryCache.at > TTL) {
    const promise = fetchCategories()
      .then((list) => list.filter((c) => c.active !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)))
      .catch((e) => {
        if (endpointMissing(e)) markAbsent("categories");
        return [] as CategoryDTO[];
      });
    categoryCache = { at: Date.now(), promise };
  }
  return categoryCache.promise;
}
let cache: { at: number; promise: Promise<Product[]> } | null = null;

export function invalidateCatalog() {
  cache = null;
}

export function getProducts(): Promise<Product[]> {
  if (!cache || Date.now() - cache.at > TTL) {
    const promise = fetchAllProducts()
      .then((list) => list.filter((d) => !isIntl || (d.priceUsd ?? 0) > 0))
      .then((list) => list.map(toProduct).filter((p) => p.active));
    cache = { at: Date.now(), promise };
    promise.catch(() => {
      if (cache?.promise === promise) cache = null;
    });
  }
  return cache.promise;
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  return (await getProducts()).find((p) => p.slug === slug);
}

const newestFirst = (a: Product, b: Product) => b.productId - a.productId;

export const collectionRules: Record<string, (p: Product, all: Product[]) => boolean> = {
  perfumes: (p) => p.type === "perfume",
  attars: (p) => p.type === "attar",
  oud: (p) => isFragrance(p) && /\boud\b/i.test(p.name),
  handicraft: (p) => p.type === "handicraft",
  "new-arrivals": (p, all) => [...all].filter(isFragrance).sort(newestFirst).slice(0, 8).includes(p),
  him: (p) => isFragrance(p) && (p.gender === "him" || p.gender === "unisex"),
  her: (p) => isFragrance(p) && (p.gender === "her" || p.gender === "unisex"),
  all: (p) => isFragrance(p),
};

export const retiredCollections: Record<string, string> = {
  bestsellers: "/collections/all",
  "gift-sets": "/collections/all",
  brass: "/collections/handicraft",
};

export async function getProductTypes(categoryId?: number): Promise<ProductTypeDTO[]> {
  if (isAbsent("product-types")) return [];
  try {
    return await fetchProductTypes(categoryId);
  } catch (e) {
    if (endpointMissing(e)) markAbsent("product-types");
    return [];
  }
}

export async function getBanners(): Promise<BannerMap> {
  if (isAbsent("banners")) return emptyBannerMap();
  try {
    const map = await fetchBanners();
    const now = Date.now();
    for (const placement of BANNER_PLACEMENTS) {
      map[placement] = map[placement].filter((b) => bannerIsLive(b, now)).sort(byDisplayOrder);
    }
    return map;
  } catch (e) {
    if (endpointMissing(e)) {
      markAbsent("banners");
    } else {
      console.error("[catalog] the banner endpoint answered, but its response could not be read", e);
    }
    return emptyBannerMap();
  }
}

const slugStem = (s: string) => s.toLowerCase().replace(/s$/, "");

export const sameSlug = (a: string, b: string) => a.toLowerCase() === b.toLowerCase() || slugStem(a) === slugStem(b);

const EDITORIAL_CARDS = ["oud", "new-arrivals", "all"];

function toCollection(c: CategoryDTO): Collection {
  const base = collections.find((x) => sameSlug(x.slug, c.slug));
  if (base) return { ...base, categoryId: c.categoryId };
  return {
    slug: c.slug,
    categoryId: c.categoryId,
    title: c.name,
    eyebrow: "Collection",
    description: c.description ?? "",
    theme: c.theme === "dark" ? "dark" : "light",
    image: { src: c.imageUrl || CATEGORY_FALLBACK_IMAGE, alt: c.name, width: 1200, height: 1500 },
    banner: c.imageUrl ? { src: c.imageUrl, alt: c.name, width: 2400, height: 900 } : undefined,
  };
}

export async function getCollections(): Promise<Collection[]> {
  const cats = await getApiCategories();
  if (!cats.length) return collections;
  const merged = collections.map((x) => {
    const match = cats.find((c) => sameSlug(c.slug, x.slug));
    return match ? toCollection(match) : x;
  });
  const extra = cats.filter((c) => !collections.some((x) => sameSlug(x.slug, c.slug))).map(toCollection);
  return [...merged, ...extra];
}

export async function getCollection(slug: string): Promise<Collection | undefined> {
  return (await getCollections()).find((c) => sameSlug(c.slug, slug));
}

export async function getCollectionProducts(slug: string): Promise<Product[]> {
  const [all, cats] = await Promise.all([getProducts(), getApiCategories()]);
  const rule = collectionRules[slug];

  const category = cats.find((c) => sameSlug(c.slug, slug));
  if (category) {
    const byCategory = all.filter((p) => p.categoryId === category.categoryId);
    if (byCategory.length || !rule) return byCategory;
  }

  if (!rule) return [];
  const list = all.filter((p) => rule(p, all));
  return slug === "new-arrivals" ? list.sort(newestFirst) : list;
}

export async function getCategories(): Promise<Category[]> {
  const [all, cats] = await Promise.all([getProducts(), getApiCategories()]);

  const byStaticRule = (slug: string) => {
    const rule = collectionRules[slug];
    return rule ? all.some((p) => rule(p, all)) : false;
  };

  if (!cats.length) return allCategories.filter((c) => byStaticRule(c.slug));

  const cards: Category[] = [];
  for (const c of cats) {
    const base = allCategories.find((x) => sameSlug(x.slug, c.slug));
    const stocked = all.some((p) => p.categoryId === c.categoryId) || byStaticRule(c.slug);
    if (!stocked) continue;
    cards.push(
      base
        ? { ...base, categoryId: c.categoryId, theme: c.theme === "dark" ? "dark" : c.theme === "light" ? "light" : base.theme }
        : {
            slug: c.slug,
            categoryId: c.categoryId,
            title: c.name,
            description: c.description ?? "",
            href: `/collections/${c.slug}`,
            theme: c.theme === "dark" ? "dark" : "light",
            image: { src: c.imageUrl || CATEGORY_FALLBACK_IMAGE, alt: c.name, width: 1500, height: 1300 },
          },
    );
  }

  for (const slug of EDITORIAL_CARDS) {
    if (cards.some((x) => sameSlug(x.slug, slug))) continue;
    const base = allCategories.find((x) => x.slug === slug);
    if (base && byStaticRule(slug)) cards.push(base);
  }

  return cards;
}

export async function getRelatedProducts(product: Product, limit = 8): Promise<Product[]> {
  const score = (p: Product) => p.families.filter((f) => product.families.includes(f)).length * 2 + (p.world === product.world ? 1 : 0) + (p.gender === product.gender ? 0.5 : 0);
  return (await getProducts())
    .filter((p) => p.id !== product.id && isFragrance(p) === isFragrance(product))
    .sort((a, b) => score(b) - score(a) || newestFirst(a, b))
    .slice(0, limit);
}

export async function getJournal() {
  return journal;
}

export async function getArticle(slug: string) {
  return journal.find((a) => a.slug === slug);
}

export async function getTestimonials() {
  return testimonials;
}
