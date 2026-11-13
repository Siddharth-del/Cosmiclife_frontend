import { useMemo } from "react";
import { CollectionHero } from "@/components/collections/CollectionHero";
import { CollectionView } from "@/components/collections/CollectionView";
import { CollectionSwitcher } from "@/components/collections/CollectionSwitcher";
import { ProductTypeFilter } from "@/components/products/ProductTypeFilter";
import { getCollection, getCollectionProducts, getProductTypes, retiredCollections } from "@/lib/catalog";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { redirect, useLoaderData, useLocation, useSearchParams, type LoaderFunctionArgs } from "react-router";
import { notFound } from "@/lib/router";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useCategoryTheme } from "@/hooks/useCategoryTheme";

export async function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug ?? "";
  if (retiredCollections[slug]) throw redirect(retiredCollections[slug]);
  const collection = await getCollection(slug);
  if (!collection) notFound();
  const [products, productTypes] = await Promise.all([getCollectionProducts(slug), getProductTypes(collection.categoryId)]);
  return { collection, products, productTypes };
}

export default function CollectionPage() {
  const { collection, products, productTypes } = useLoaderData<typeof loader>();
  usePageMeta(collection.title, collection.description);
  const palette = useCategoryTheme(collection.slug, collection.theme);
  const dark = palette.tone === "dark";
  const handicraft = collection.world === "handicraft";
  const { search } = useLocation();
  const [params, setParams] = useSearchParams();
  const activeType = params.get("type");

  const counts = useMemo(() => {
    const byId = new Map(productTypes.map((t) => [t.productTypeId, t.slug]));
    const out: Record<string, number> = {};
    for (const p of products) {
      const slug = p.productTypeId != null ? byId.get(p.productTypeId) : undefined;
      if (slug) out[slug] = (out[slug] ?? 0) + 1;
    }
    return out;
  }, [products, productTypes]);

  const shown = useMemo(() => {
    if (!activeType) return products;
    const match = productTypes.find((t) => t.slug === activeType);
    if (!match) return products;
    return products.filter((p) => p.productTypeId === match.productTypeId);
  }, [products, productTypes, activeType]);

  const pickType = (slug: string | null) => {
    const next = new URLSearchParams(params);
    if (slug) next.set("type", slug);
    else next.delete("type");
    setParams(next, { replace: true, preventScrollReset: true });
  };

  return (
    <div className="category-surface">
      <CollectionHero collection={collection} count={products.length} />
      <div className="container-site pb-section pt-10 md:pt-14">
        {collection.world && (
          <div className="mb-10 flex justify-center">
            <CollectionSwitcher value={collection.world} tone={dark ? "light" : "dark"} id="collection-world" />
          </div>
        )}

        <ProductTypeFilter
          types={productTypes}
          value={activeType}
          onChange={pickType}
          counts={counts}
          tone={dark ? "light" : "dark"}
          className="mb-10 justify-center"
        />

        {shown.length ? (
          <CollectionView key={`${search}-${activeType ?? "all"}`} products={shown} tone={dark ? "light" : "dark"} />
        ) : products.length ? (
          <EmptyState
            tone={dark ? "light" : "dark"}
            title="Nothing in that type yet"
            body="No products here carry that type. Clear the filter to see the whole collection."
            action={
              <ButtonLink href={`/collections/${collection.slug}`} variant={dark ? "light" : "primary"} arrow>
                Show everything
              </ButtonLink>
            }
          />
        ) : (
          <EmptyState
            tone={dark ? "light" : "dark"}
            title="Nothing here yet"
            body={handicraft ? "There are no handicraft pieces in the collection right now." : collection.world ? "There are no fragrances in this collection right now." : "There's nothing in this collection right now."}
            action={
              <ButtonLink href="/collections/all" variant={dark ? "light" : "primary"} arrow>
                Shop all fragrances
              </ButtonLink>
            }
          />
        )}
      </div>
    </div>
  );
}
