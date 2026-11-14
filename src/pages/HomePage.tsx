import { HeroSection } from "@/components/hero/HeroSection";
import { HeroCarousel } from "@/components/hero/HeroCarousel";
import { CategoryShelves } from "@/components/category/CategoryShelves";
import { GiftingBanner } from "@/components/gifting/GiftingBanner";
import { FragranceDiscovery } from "@/components/discovery/FragranceDiscovery";
import { JournalSection } from "@/components/editorial/JournalSection";
import { Testimonials } from "@/components/testimonials/Testimonials";
import { WhyChooseUs } from "@/components/brand/WhyChooseUs";
import { CatalogEmpty, CatalogUnavailable } from "@/components/layout/CatalogUnavailable";
import { getBanners, getCategories, getJournal, getProducts, getTestimonials, isFragrance } from "@/lib/catalog";
import { bannerSlides } from "@/lib/api/banners";
import { useLoaderData } from "react-router";
import { usePageMeta } from "@/hooks/usePageMeta";

export async function loader() {
  const [journal, testimonials, banners] = await Promise.all([getJournal(), getTestimonials(), getBanners()]);
  try {
    const [products, categories] = await Promise.all([getProducts(), getCategories()]);
    return { products, categories, banners, journal, testimonials, catalogError: null as string | null };
  } catch (e) {
    return { products: [], categories: [], banners, journal, testimonials, catalogError: e instanceof Error ? e.message : "We couldn't load our fragrances." };
  }
}

export default function HomePage() {
  const { products, categories, banners, journal, testimonials, catalogError } = useLoaderData<typeof loader>();
  usePageMeta();
  const heroSlides = bannerSlides(banners.HERO);
  const fragrances = products.filter(isFragrance);
  const newest = [...fragrances].sort((a, b) => b.productId - a.productId);

  return (
    <>
      {heroSlides.length ? <HeroCarousel slides={heroSlides} /> : <HeroSection />}
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
          <CategoryShelves categories={categories} products={products} />
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
