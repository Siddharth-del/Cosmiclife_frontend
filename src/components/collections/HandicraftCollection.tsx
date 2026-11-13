import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "@/components/ui/Image";
import Link from "@/components/ui/Link";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { materials } from "@/lib/catalog";
import { EASE } from "@/lib/motion";
import type { Collection, Product } from "@/types";

export function HandicraftCollection({ collection, products }: { collection: Collection; products: Product[] }) {
  const reduce = useReducedMotion();
  if (!products.length) return null;
  const count = products.length;
  const lines = materials.map((m) => ({ ...m, count: products.filter((p) => p.material === m.slug).length })).filter((m) => m.count > 0);

  return (
    <section aria-labelledby="handicraft-title" className="grain relative overflow-hidden bg-espresso-deep py-section text-ivory">
      <div className="container-site relative grid grid-cols-1 gap-y-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_auto] lg:gap-x-20 lg:gap-y-0">
        <Reveal className="lg:col-start-2 lg:row-start-1 lg:self-end">
          <SectionHeading
            tone="light"
            eyebrow="The Handicraft Collection"
            title={
              <span id="handicraft-title">
                Made
                <br />
                to keep
              </span>
            }
          />
        </Reveal>

        <motion.div
          className="relative mx-auto w-full max-w-[22rem] pb-4 pr-4 sm:max-w-[26rem] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mx-0 lg:max-w-none lg:self-center lg:pb-6 lg:pr-6"
          initial={reduce ? false : "hidden"}
          whileInView="shown"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.div
            aria-hidden
            className="absolute bottom-0 left-4 right-0 top-4 rounded-t-full border border-gold/60 lg:left-6 lg:top-6"
            variants={{ hidden: { x: -16, y: -16, opacity: 0 }, shown: { x: 0, y: 0, opacity: 1, transition: { duration: 1.6, ease: EASE, delay: 0.5 } } }}
          />
          <motion.div
            className="relative aspect-[4/5] overflow-hidden rounded-t-full bg-espresso"
            variants={{ hidden: { clipPath: "inset(100% 0% 0% 0%)" }, shown: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 1.4, ease: EASE } } }}
          >
            <Image src={collection.image.src} alt={collection.image.alt} fill loading="eager" sizes="(min-width: 1024px) 36vw, 26rem" className="object-cover object-[50%_60%]" />
          </motion.div>
        </motion.div>

        <div className="min-w-0 lg:col-start-2 lg:row-start-2">
          <Reveal delay={0.1}>
            <p className="max-w-prose text-[0.95rem] leading-relaxed text-ivory/70 lg:mt-6">{collection.description}</p>
            {lines.length > 1 && (
              <ul className="mt-8 flex flex-wrap gap-x-10 gap-y-3" aria-label="Shop by material">
                {lines.map((l) => (
                  <li key={l.slug}>
                    <Link href={`/collections/${collection.slug}?material=${l.slug}`} className="group/line inline-flex items-baseline gap-3 font-display text-[1.6rem] font-light uppercase leading-none tracking-[0.04em] transition-colors duration-500 hover:text-gold-soft">
                      <span className="link-underline pb-1">{l.label}</span>
                      <span className="font-sans text-[0.7rem] tracking-[0.18em] text-ivory/45 tabular">{l.count}</span>
                      <ArrowRight aria-hidden className="h-4 w-4 -translate-x-1 self-center opacity-0 transition-all duration-500 ease-luxe group-hover/line:translate-x-0 group-hover/line:opacity-100" strokeWidth={1.2} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Reveal>

          <Reveal delay={0.15} className="mt-10">
            <ProductCarousel label="The Handicraft Collection" tone="light" itemClassName="w-[64vw] xs:w-[46vw] sm:w-[36vw] md:w-[30vw] lg:w-[calc((100%-1.5rem)/2)]">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} tone="light" sizes="(min-width: 1024px) 26vw, (min-width: 640px) 36vw, 64vw" />
              ))}
            </ProductCarousel>
          </Reveal>

          <Reveal delay={0.2} className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <ButtonLink href={`/collections/${collection.slug}`} variant="outline-light" size="lg" arrow>
              Explore the collection
            </ButtonLink>
            <p className="text-[0.8rem] text-ivory/50">
              {count} {count === 1 ? "piece" : "pieces"} made by hand
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
