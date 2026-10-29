import { HeroSection } from "@/components/hero/HeroSection";
import { WorldsSplit } from "@/components/collections/WorldsSplit";
import { ShopByCategory } from "@/components/category/ShopByCategory";
import { Bestsellers } from "@/components/products/Bestsellers";
import { GiftingBanner } from "@/components/gifting/GiftingBanner";
import { HandicraftCollection } from "@/components/collections/HandicraftCollection";
import { FragranceDiscovery } from "@/components/discovery/FragranceDiscovery";
import { JournalSection } from "@/components/editorial/JournalSection";
import { Testimonials } from "@/components/testimonials/Testimonials";
import { WhyChooseUs } from "@/components/brand/WhyChooseUs";
import { CatalogEmpty, CatalogUnavailable } from "@/components/layout/CatalogUnavailable";
import { getCategories, getCollection, getCollectionProducts, getCollectionTabs, getJournal, getProducts, getTestimonials, isFragrance } from "@/lib/catalog";
import { useLoaderData } from "react-router";
import { usePageMeta } from "@/hooks/usePageMeta";

export async function loader() {
  const [journal, testimonials, handicraftCollection] = await Promise.all([getJournal(), getTestimonials(), getCollection("handicraft")]);
  try {
    const [products, categories, tabs, handicraft] = await Promise.all([getProducts(), getCategories(), getCollectionTabs(), getCollectionProducts("handicraft")]);
    return { products, categories, tabs, handicraft, handicraftCollection, journal, testimonials, catalogError: null as string | null };
  } catch (e) {
    return { products: [], categories: [], tabs: { him: [], her: [], attar: [] }, handicraft: [], handicraftCollection, journal, testimonials, catalogError: e instanceof Error ? e.message : "We couldn't load our fragrances." };
  }
}

export default function HomePage() {
  const { products, categories, tabs, handicraft, handicraftCollection, journal, testimonials, catalogError } = useLoaderData<typeof loader>();
  usePageMeta();
  const fragrances = products.filter(isFragrance);
  const newest = [...fragrances].sort((a, b) => b.productId - a.productId);

  return (
    <>
      <HeroSection />
      <WorldsSplit />
      {catalogError ? (
        <section className="bg-sand">
          <div className="container-site py-section">
            <CatalogUnavailable message={catalogError} />
          </div>
        </section>
      ) : products.length === 0 ? (
        <section className="bg-sand">
          <div className="container-site py-section">
            <CatalogEmpty />
          </div>
        </section>
      ) : (
        <>
          {handicraftCollection && <HandicraftCollection collection={handicraftCollection} products={[...handicraft].sort((a, b) => b.productId - a.productId)} />}
          <ShopByCategory categories={categories} />
          <Bestsellers data={tabs} />
          <GiftingBanner sets={newest} />
          <FragranceDiscovery products={fragrances} />
        </>
      )}
      <JournalSection articles={journal} />
      <Testimonials items={testimonials} products={products} />
      <WhyChooseUs />
    </>
  );
}
