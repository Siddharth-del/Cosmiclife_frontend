import { categories as allCategories, collections } from "@/data/collections";
import { journal } from "@/data/journal";
import { testimonials } from "@/data/testimonials";
import { fetchAllProducts } from "@/lib/api/products";
import { fromMinorUnits, rupees, type FragranceFamilyEnum, type MaterialEnum, type ProductDTO } from "@/lib/api/types";
import { isIntl } from "@/lib/market";
import type { Collection, Material, Product, ProductImage, ProductType, ScentFamily } from "@/types";

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

export function productWorld(d: Pick<ProductDTO, "category" | "fragranceFamily">): ProductType {
  if (d.category === "ATTAR") return "attar";
  if (d.category === "PERFUME") return "perfume";
  if (d.category === "HANDICRAFT") return "handicraft";
  return d.fragranceFamily ? "perfume" : "handicraft";
}

export const materials: { slug: Material; label: string; value: MaterialEnum }[] = [
  { slug: "brass", label: "Brass", value: "BRASS" },
  { slug: "copper", label: "Copper", value: "COPPER" },
  { slug: "others", label: "Others", value: "OTHERS" },
];

export function productMaterial(d: Pick<ProductDTO, "category" | "fragranceFamily" | "material">): Material | undefined {
  if (productWorld(d) !== "handicraft") return undefined;
  return materials.find((m) => m.value === d.material)?.slug ?? "others";
}

export const materialLabel = (m: Material | undefined) => materials.find((x) => x.slug === m)?.label ?? "";

export const isFragrance = (p: Pick<Product, "type">) => p.type !== "handicraft";

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

export async function getCollections(): Promise<Collection[]> {
  return collections;
}

export async function getCollection(slug: string): Promise<Collection | undefined> {
  return collections.find((c) => c.slug === slug);
}

export async function getCollectionProducts(slug: string): Promise<Product[]> {
  const rule = collectionRules[slug];
  if (!rule) return [];
  const all = await getProducts();
  const list = all.filter((p) => rule(p, all));
  return slug === "new-arrivals" ? list.sort(newestFirst) : list;
}

export async function getCategories() {
  const all = await getProducts();
  return allCategories.filter((c) => {
    const rule = collectionRules[c.slug];
    return rule && all.some((p) => rule(p, all));
  });
}

export type CollectionTab = "him" | "her" | "attar";

export async function getCollectionTabs(): Promise<Record<CollectionTab, Product[]>> {
  const sorted = [...(await getProducts())].sort(newestFirst);
  return {
    him: sorted.filter((p) => p.type === "perfume" && (p.gender === "him" || p.gender === "unisex")).slice(0, 10),
    her: sorted.filter((p) => p.type === "perfume" && (p.gender === "her" || p.gender === "unisex")).slice(0, 10),
    attar: sorted.filter((p) => p.type === "attar").slice(0, 10),
  };
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
