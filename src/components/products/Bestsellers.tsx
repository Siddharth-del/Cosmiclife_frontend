import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TextLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "./ProductCard";
import { ProductCarousel } from "./ProductCarousel";
import { useCategoryTheme } from "@/hooks/useCategoryTheme";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import type { Category, Product } from "@/types";

interface Group {
  slug: string;
  label: string;
  href: string;
  theme: "light" | "dark" | null;
  products: Product[];
}

const LIMIT = 10;

function groupsFrom(categories: Category[], products: Product[]): Group[] {
  const groups: Group[] = [];
  const seen = new Set<string>();

  for (const category of categories) {
    const slug = category.slug.toLowerCase();
    if (seen.has(slug)) continue;
    seen.add(slug);
    const matched = products.filter((p) => (p.categorySlug ?? "").toLowerCase() === slug);
    if (matched.length) groups.push({ slug, label: category.title, href: category.href, theme: category.theme ?? null, products: matched.slice(0, LIMIT) });
  }

  if (!groups.length) {
    const byName = new Map<string, Product[]>();
    for (const product of products) {
      const name = product.categoryName || product.world;
      const list = byName.get(name) ?? [];
      list.push(product);
      byName.set(name, list);
    }
    for (const [name, list] of byName) {
      groups.push({ slug: name.toLowerCase(), label: name, href: `/collections/${name.toLowerCase()}`, theme: null, products: list.slice(0, LIMIT) });
    }
  }

  return groups;
}

export function Bestsellers({ categories, products }: { categories: Category[]; products: Product[] }) {
  const groups = useMemo(() => groupsFrom(categories, products), [categories, products]);
  const [picked, setPicked] = useState<string | null>(null);
  const active = picked && groups.some((g) => g.slug === picked) ? picked : groups[0]?.slug;
  const current = groups.find((g) => g.slug === active);
  const palette = useCategoryTheme(active, current?.theme ?? null);
  const light = palette.tone === "dark";

  if (!current) return null;

  return (
    <section aria-labelledby="bestsellers-title" className="category-surface overflow-hidden py-section">
      <div className="container-site">
        <Reveal>
          <SectionHeading
            eyebrow="The collection"
            title={<span id="bestsellers-title">Our fragrances</span>}
            tone={light ? "light" : "dark"}
            action={<TextLink href={current.href}>View all {current.label}</TextLink>}
          />
        </Reveal>

        <div role="tablist" aria-label="Categories" className={cn("no-scrollbar -mx-gutter mt-10 flex gap-8 overflow-x-auto border-b px-gutter md:mx-0 md:px-0", light ? "border-ivory/20" : "border-hair")}>
          {groups.map((g) => (
            <button
              key={g.slug}
              role="tab"
              type="button"
              aria-selected={active === g.slug}
              aria-controls="bestseller-panel"
              onClick={() => setPicked(g.slug)}
              className={cn(
                "relative shrink-0 pb-4 text-[0.72rem] font-medium uppercase tracking-[0.26em] transition-colors duration-300",
                active === g.slug ? (light ? "text-ivory" : "text-ink") : light ? "text-ivory/55 hover:text-ivory/80" : "text-ink-faint hover:text-ink-muted",
              )}
            >
              {g.label}
              {active === g.slug && (
                <motion.span layoutId="bestseller-tab" className="category-accent absolute inset-x-0 -bottom-px h-px bg-current" transition={{ duration: 0.6, ease: EASE }} />
              )}
            </button>
          ))}
        </div>

        <div id="bestseller-panel" role="tabpanel" className="mt-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={active} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.55, ease: EASE }}>
              <ProductCarousel label={`${current.label} products`} tone={light ? "light" : "dark"}>
                {current.products.map((p, i) => (
                  <ProductCard key={p.id} product={p} tone={light ? "light" : "dark"} priority={i < 2} />
                ))}
              </ProductCarousel>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
