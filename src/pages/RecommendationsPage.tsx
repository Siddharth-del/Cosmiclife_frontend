import { useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useCatalog } from "@/components/layout/CatalogProvider";
import { FragranceFilter } from "@/components/discovery/FragranceFilter";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useHydrated } from "@/hooks/useHydrated";
import { usePageMeta } from "@/hooks/usePageMeta";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { getCategories } from "@/lib/catalog";
import { NO_PREFERENCES, bestValue, budgetBands, hasPreferences, inStock, newIn, priceOf, rankByPreferences, recommendFromSignals, type Recommendation, type Preferences } from "@/lib/recommend";
import { genderLabel } from "@/lib/scent";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import type { Gender, ScentFamily } from "@/types";

export async function loader() {
  try {
    return { categories: await getCategories() };
  } catch {
    return { categories: [] as Awaited<ReturnType<typeof getCategories>> };
  }
}

const GENDERS: Gender[] = ["him", "her", "unisex"];

function Pill({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-11 shrink-0 items-center gap-2 overflow-hidden rounded-full border px-5 text-[0.78rem] tracking-[0.04em] transition-colors duration-300",
        active ? "border-espresso text-ivory" : "border-espresso/25 text-ink hover:border-espresso/70",
      )}
    >
      {active && <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }} className="absolute inset-0 rounded-full bg-espresso" />}
      <span className="relative flex items-center gap-2">
        {children}
        {count !== undefined && <span className={cn("text-[0.68rem] tabular", active ? "opacity-70" : "opacity-45")}>{count}</span>}
      </span>
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label mb-3 text-ink-muted">{label}</p>
      <div role="group" aria-label={label} className="no-scrollbar -mx-gutter flex gap-2 overflow-x-auto px-gutter md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        {children}
      </div>
    </div>
  );
}

function Reasons({ reasons }: { reasons: string[] }) {
  if (!reasons.length) return null;
  return <p className="mt-3 text-[0.74rem] leading-snug text-ink-muted">{reasons.slice(0, 3).join(" · ")}</p>;
}

function PickCard({ pick }: { pick: Recommendation }) {
  return (
    <div>
      <ProductCard product={pick.product} />
      <Reasons reasons={pick.reasons} />
    </div>
  );
}

export default function RecommendationsPage() {
  usePageMeta("Recommendations", "Tell us what you like and we will suggest what to try next.");
  const { categories } = useLoaderData<typeof loader>();
  const catalog = useCatalog();
  const hydrated = useHydrated();
  const savedIds = useWishlist((s) => s.ids);
  const bag = useCart((s) => s.cart?.lines);

  const [prefs, setPrefs] = useState<Preferences>(NO_PREFERENCES);
  const [band, setBand] = useState<string | null>(null);

  const available = useMemo(() => catalog.filter(inStock), [catalog]);

  // ----- the finder: every option below comes from the products that exist -----
  const categoryCounts = useMemo(() => {
    const out = new Map<number, number>();
    for (const p of available) if (p.categoryId !== undefined) out.set(p.categoryId, (out.get(p.categoryId) ?? 0) + 1);
    return out;
  }, [available]);
  const shownCategories = categories.filter((c) => c.categoryId !== undefined && (categoryCounts.get(c.categoryId) ?? 0) > 0);

  const pool = useMemo(() => (prefs.categoryId === null ? available : available.filter((p) => p.categoryId === prefs.categoryId)), [available, prefs.categoryId]);

  const types = useMemo(() => {
    const out = new Map<number, { name: string; count: number }>();
    for (const p of pool) {
      if (p.productTypeId === undefined || !p.productTypeName) continue;
      const hit = out.get(p.productTypeId);
      out.set(p.productTypeId, { name: p.productTypeName, count: (hit?.count ?? 0) + 1 });
    }
    return [...out.entries()].map(([id, v]) => ({ id, ...v }));
  }, [pool]);

  const bands = useMemo(() => budgetBands(pool.map(priceOf), formatPrice), [pool]);
  const hasScents = pool.some((p) => p.families.length > 0);
  const hasGendered = pool.some((p) => p.families.length > 0 || p.type === "perfume" || p.type === "attar");
  const scentCounts = useMemo(() => {
    const out: Partial<Record<ScentFamily, number>> = {};
    for (const p of pool) for (const f of p.families) out[f] = (out[f] ?? 0) + 1;
    return out;
  }, [pool]);

  const set = (patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch }));
  const chooseCategory = (categoryId: number | null) => {
    setBand(null);
    setPrefs({ ...NO_PREFERENCES, categoryId });
  };
  const chooseBand = (id: string | null) => {
    const found = bands.find((b) => b.id === id);
    setBand(found ? found.id : null);
    set({ min: found?.min ?? 0, max: found?.max ?? Infinity });
  };
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const picks = useMemo(() => rankByPreferences(available, prefs, formatPrice, 8), [available, prefs]);
  const chosen = hasPreferences(prefs);

  // ----- what the shopper has shown they like -----
  const signals = useMemo(() => {
    if (!hydrated) return [];
    const ids = new Set(savedIds);
    for (const l of bag ?? []) ids.add(String(l.productId));
    return catalog.filter((p) => ids.has(p.id));
  }, [hydrated, savedIds, bag, catalog]);
  const forYou = useMemo(() => recommendFromSignals(signals, available, 8), [signals, available]);

  const fresh = useMemo(() => newIn(catalog, 8), [catalog]);
  const value = useMemo(() => bestValue(catalog, 8), [catalog]);

  return (
    <div className="bg-ivory pb-section">
      <header className="container-site border-b border-hair py-14 md:py-20">
        <p className="eyebrow text-gold-deep">Recommendations</p>
        <h1 className="mt-4 text-display-lg font-light uppercase">Picked for you</h1>
        <p className="mt-5 max-w-xl text-[0.98rem] text-ink-muted">Tell us what you are looking for, or let us learn from what you have saved. Every suggestion comes with the reason we chose it.</p>
      </header>

      <div className="container-site mt-14 space-y-section">
        {forYou.length > 0 ? (
          <section aria-labelledby="for-you-title">
            <Reveal>
              <SectionHeading eyebrow="From your taste" title={<span id="for-you-title">Because of what you saved</span>} intro={`Based on ${signals.length} ${signals.length === 1 ? "item" : "items"} in your wishlist and bag.`} />
            </Reveal>
            <div className="mt-10">
              <ProductCarousel label="Recommended from your wishlist and bag">
                {forYou.map((p) => (
                  <PickCard key={p.product.id} pick={p} />
                ))}
              </ProductCarousel>
            </div>
          </section>
        ) : (
          hydrated &&
          catalog.length > 0 && (
            <p className="flex items-center gap-3 border border-hair px-5 py-4 text-[0.88rem] text-ink-muted">
              <Heart aria-hidden className="h-4 w-4 shrink-0 text-gold-deep" strokeWidth={1.4} />
              Tap the heart on a few products and we will suggest more like them, right here.
            </p>
          )
        )}

        <section aria-labelledby="finder-title">
          <Reveal>
            <SectionHeading eyebrow="Find your pick" title={<span id="finder-title">Tell us what you like</span>} intro="Choose any of these. Leave the rest open." />
          </Reveal>

          <div className="mt-10 space-y-8">
            {shownCategories.length > 1 && (
              <Group label="What are you shopping for?">
                <Pill active={prefs.categoryId === null} onClick={() => chooseCategory(null)}>
                  Anything
                </Pill>
                {shownCategories.map((c) => (
                  <Pill key={c.slug} active={prefs.categoryId === c.categoryId} onClick={() => chooseCategory(prefs.categoryId === c.categoryId ? null : (c.categoryId ?? null))} count={categoryCounts.get(c.categoryId ?? -1)}>
                    {c.title}
                  </Pill>
                ))}
              </Group>
            )}

            {types.length > 1 && (
              <Group label="Type">
                {types.map((t) => (
                  <Pill key={t.id} active={prefs.productTypeId === t.id} onClick={() => set({ productTypeId: prefs.productTypeId === t.id ? null : t.id })} count={t.count}>
                    {t.name}
                  </Pill>
                ))}
              </Group>
            )}

            {bands.length > 0 && (
              <Group label="Your budget">
                {bands.map((b) => (
                  <Pill key={b.id} active={band === b.id} onClick={() => chooseBand(band === b.id ? null : b.id)}>
                    {b.label}
                  </Pill>
                ))}
              </Group>
            )}

            {hasGendered && (
              <Group label="Who is it for?">
                {GENDERS.map((g) => (
                  <Pill key={g} active={prefs.genders.includes(g)} onClick={() => set({ genders: toggle(prefs.genders, g) })}>
                    {genderLabel[g]}
                  </Pill>
                ))}
              </Group>
            )}

            {hasScents && (
              <div>
                <p className="label mb-3 text-ink-muted">Scents you like</p>
                <FragranceFilter value={prefs.families} onChange={(families) => set({ families })} counts={scentCounts} available={new Set(pool.flatMap((p) => p.families))} rail />
              </div>
            )}
          </div>

          <div className="mt-10 flex items-center justify-between border-b border-hair pb-4 text-[0.8rem] text-ink-muted" aria-live="polite">
            <span>{chosen ? `${picks.length} ${picks.length === 1 ? "match" : "matches"}, best first` : "Choose something above, or start with our favourites below."}</span>
            {chosen && (
              <button type="button" onClick={() => chooseCategory(null)} className="label text-ink underline-offset-4 hover:underline">
                Clear all
              </button>
            )}
          </div>

          {chosen &&
            (picks.length ? (
              <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
                {picks.map((p) => (
                  <PickCard key={p.product.id} pick={p} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No exact match"
                body="Nothing fits every choice. Loosen one of them, such as the budget or a scent, and we will find something close."
                action={
                  <Button variant="outline" onClick={() => chooseCategory(prefs.categoryId)}>
                    Reset choices
                  </Button>
                }
              />
            ))}
        </section>

        {fresh.length > 0 && (
          <section aria-labelledby="new-in-title">
            <Reveal>
              <SectionHeading eyebrow="Just added" title={<span id="new-in-title">New in</span>} />
            </Reveal>
            <div className="mt-10">
              <ProductCarousel label="Newest products">
                {fresh.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </ProductCarousel>
            </div>
          </section>
        )}

        {value.length > 0 && (
          <section aria-labelledby="value-title">
            <Reveal>
              <SectionHeading eyebrow="Biggest savings" title={<span id="value-title">Best value</span>} />
            </Reveal>
            <div className="mt-10">
              <ProductCarousel label="Products with the biggest discounts">
                {value.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </ProductCarousel>
            </div>
          </section>
        )}

        {catalog.length === 0 && (
          <EmptyState
            title="Nothing to recommend yet"
            body="Our collection is being updated. Please check back shortly."
            action={
              <ButtonLink href="/collections/all" arrow>
                Shop all
              </ButtonLink>
            }
          />
        )}
      </div>
    </div>
  );
}
