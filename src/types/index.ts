export type World = "attar" | "perfume" | "handicraft";
export type Gender = "him" | "her" | "unisex";
export type ProductType = "perfume" | "attar" | "handicraft";
export type Material = "brass" | "copper" | "others";
export type Badge = "bestseller" | "new" | "limited";

export type ScentFamily = "amber" | "aquatic" | "aromatic" | "earthy" | "floral" | "mixed" | "woody";

export type Occasion =
  | "evening"
  | "office"
  | "date-night"
  | "wedding"
  | "everyday"
  | "festive"
  | "travel"
  | "prayer";

export interface ProductImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ProductVariant {
  id: string;
  size: string;
  price: number;
  compareAt?: number;
  inStock: boolean;
}

export interface NotePyramid {
  top: string[];
  heart: string[];
  base: string[];
}

export interface Accord {
  name: string;
  strength: number;
}

export interface Product {
  id: string;
  productId: number;
  slug: string;
  name: string;
  type: ProductType;
  world: World;
  material?: Material;
  gender: Gender;
  family: string;
  families: ScentFamily[];
  description: string;
  variants: ProductVariant[];
  images: ProductImage[];
  stock: number;
  active: boolean;
  discount: number;
  badges: Badge[];
  tagline?: string;
  story?: string;
  notes?: NotePyramid;
  accords?: Accord[];
  occasions?: Occasion[];
  seasons?: string[];
  timeOfDay?: "Day" | "Night" | "Day & Night";
  longevity?: string;
  sillage?: "Intimate" | "Moderate" | "Strong";
  concentration?: string;
  rating?: number;
  reviewCount?: number;
}

export interface Collection {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  world?: World;
  theme: "light" | "dark";
  image: ProductImage;
  banner?: ProductImage;
}

export interface Category {
  slug: string;
  title: string;
  description: string;
  href: string;
  image: ProductImage;
}

export interface JournalArticle {
  slug: string;
  title: string;
  kicker: string;
  excerpt: string;
  readTime: string;
  date: string;
  image: ProductImage;
  cover?: ProductImage & { position?: string };
  body: { heading?: string; paragraphs: string[] }[];
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  city: string;
  rating: number;
  verified: boolean;
  productSlug?: string;
}
