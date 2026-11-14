import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import Link from "@/components/ui/Link";
import { TextLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { categoryPalette, paletteVars } from "@/lib/categoryTheme";
import type { Category, Product } from "@/types";

interface Shelf {
  slug: string;
  label: string;
  description: string;
  href: string;
  theme: "light" | "dark" | null;
  total: number;
  products: Product[];
}

const LIMIT = 10;

const sameKey = (a: string | undefined, b: string) => (a ?? "").toLowerCase() === b.toLowerCase();

/**
 * One shelf per category, in the order the admin set. Nothing here names a
 * specific category: a category created in the admin panel shows up on the
 * home page as soon as it has an active product.
 */
function shelvesFrom(categories: Category[], products: Product[]): Shelf[] {
  const shelves: Shelf[] = [];
  const seen = new Set<string>();

  for (const category of categories) {
    const key = category.slug.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const matched = products.filter((p) => (category.categoryId !== undefined && p.categoryId === category.categoryId) || sameKey(p.categorySlug, key));
    if (!matched.length) continue;
    shelves.push({
      slug: key,
      label: category.title,
      description: category.description,
      href: category.href,
      theme: category.theme ?? null,
      total: matched.length,
      products: matched.slice(0, LIMIT),
    });
  }

  if (!shelves.length) {
    const byName = new Map<string, Product[]>();
    for (const product of products) {
      const name = product.categoryName || product.world;
      byName.set(name, [...(byName.get(name) ?? []), product]);
    }
    for (const [name, list] of byName) {
      const slug = name.toLowerCase();
      shelves.push({ slug, label: name, description: "", href: `/collections/${slug}`, theme: null, total: list.length, products: list.slice(0, LIMIT) });
    }
  }

  return shelves;
}

export function CategoryShelves({ categories, products }: { categories: Category[]; products: Product[] }) {
  const shelves = useMemo(() => shelvesFrom(categories, products), [categories, products]);
  if (!shelves.length) return null;

  return (
    <div aria-label="Shop by category">
      {shelves.map((shelf, index) => {
        const palette = categoryPalette(shelf.slug, shelf.theme);
        const dark = palette.tone === "dark";
        const tone = dark ? "light" : "dark";
        const titleId = `shelf-${shelf.slug}`;
        return (
          <section key={shelf.slug} aria-labelledby={titleId} className="category-surface overflow-hidden py-12 md:py-16" style={paletteVars(palette)}>
            <div className="container-site">
              <Reveal y={16}>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6 md:mb-8">
                  <div className="min-w-0 sm:flex-1">
                    <p className="eyebrow category-accent mb-2">{shelf.total} {shelf.total === 1 ? "piece" : "pieces"}</p>
                    <h2 id={titleId} className="break-words text-display-sm uppercase">
                      {shelf.label}
                    </h2>
                  </div>
                  <TextLink href={shelf.href} className="self-start sm:shrink-0 sm:self-auto">
                    View all {shelf.label}
                  </TextLink>
                </div>
              </Reveal>

              <ProductCarousel label={`${shelf.label} products`} tone={tone}>
                {[
                  ...shelf.products.map((p, i) => <ProductCard key={p.id} product={p} tone={tone} priority={index === 0 && i < 2} />),
                  ...(shelf.total > shelf.products.length
                    ? [
                        <Link
                          key="view-all"
                          href={shelf.href}
                          className="category-accent group/all flex aspect-[4/5] flex-col items-center justify-center gap-4 border border-current/30 text-center transition-colors duration-500 hover:border-current"
                        >
                          <span className="font-display text-[1.4rem] uppercase tracking-[0.05em]">View all {shelf.label}</span>
                          <ArrowRight className="h-5 w-5 transition-transform duration-500 ease-luxe group-hover/all:translate-x-1.5" strokeWidth={1.2} />
                        </Link>,
                      ]
                    : []),
                ]}
              </ProductCarousel>
            </div>
          </section>
        );
      })}
    </div>
  );
}
