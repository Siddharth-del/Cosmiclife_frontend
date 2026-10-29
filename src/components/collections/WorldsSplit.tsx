import Image from "@/components/ui/Image";
import Link from "@/components/ui/Link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

const worlds: {
  id: "attar" | "perfume" | "handicraft";
  eyebrow: string;
  native: string;
  title: [string, string];
  body: string;
  cta: string;
  href: string;
  image: string;
  alt: string;
  tablet?: { src: string; position: string };
}[] = [
  {
    id: "attar",
    eyebrow: "Attar",
    native: "عطر",
    title: ["The soul", "of tradition"],
    body: "Alcohol-free perfume oils of oud, rose, saffron and earth. Concentrated, intimate, worn close.",
    cta: "Explore attars",
    href: "/collections/attars",
    image: "/images/campaign/world-attar.webp",
    alt: "Gold-capped attar bottles beside smouldering oud chips in a brass bowl",
  },
  {
    id: "perfume",
    eyebrow: "Perfume",
    native: "Parfum",
    title: ["The language", "of modernity"],
    body: "Eaux de parfum with clean architecture and rich materials. Made for presence, every day.",
    cta: "Explore perfumes",
    href: "/collections/perfumes",
    image: "/images/campaign/world-perfume.webp",
    alt: "Two Cosmic Life flacons on travertine plinths in arched window light",
  },
  {
    id: "handicraft",
    eyebrow: "Handicraft",
    native: "Dastkārī",
    title: ["The warmth", "of metal"],
    body: "Brass, copper and other metals shaped by hand: they warm to the touch and deepen to a soft glow over the years.",
    cta: "Explore handicrafts",
    href: "/collections/handicraft",
    image: "/images/campaign/handicraft.webp",
    alt: "A two-tier brass stand holding attar flacons, beside hammered brass glasses",
    tablet: { src: "/images/campaign/banner-handicraft.webp", position: "md:object-[60%_50%] lg:object-[50%_60%]" },
  },
];

export function WorldsSplit() {
  return (
    <section aria-labelledby="worlds-title" className="bg-ivory py-section">
      <div className="container-site">
        <Reveal className="mb-10 flex flex-col items-center text-center md:mb-14">
          <p className="eyebrow text-gold-deep">Three worlds, one house</p>
          <h2 id="worlds-title" className="mt-4 text-display-md uppercase">
            Choose your world
          </h2>
        </Reveal>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap lg:h-[min(50rem,82vh)] lg:flex-nowrap">
          {worlds.map((w, i) => (
            <Reveal
              key={w.id}
              delay={i * 0.12}
              className={cn(
                "group/world relative min-h-[30rem] flex-1 overflow-hidden transition-[flex-grow] duration-[1.1s] ease-luxe lg:min-h-0 lg:basis-0 lg:hover:flex-[1.18]",
                w.tablet ? "md:min-h-[26rem] md:basis-full" : "md:min-h-[34rem] md:basis-[calc(50%-0.375rem)]",
              )}
            >
              <Link href={w.href} className="absolute inset-0 block" aria-label={`${w.cta}: ${w.title.join(" ")}`}>
                <div className="absolute inset-0 transition-transform duration-[2.2s] ease-luxe group-hover/world:scale-[1.06]">
                  {w.tablet ? (
                    <picture>
                      <source media="(min-width: 1024px)" srcSet={w.image} />
                      <source media="(min-width: 768px)" srcSet={w.tablet.src} />
                      <Image src={w.image} alt={w.alt} fill className={cn("object-cover object-[50%_60%]", w.tablet.position)} />
                    </picture>
                  ) : (
                    <Image src={w.image} alt={w.alt} fill sizes="(min-width: 1024px) 34vw, (min-width: 768px) 50vw, 100vw" className="object-cover" />
                  )}
                </div>
                <div
                  className={cn(
                    "absolute inset-0 transition-opacity duration-1000 ease-luxe",
                    w.id === "perfume"
                      ? "bg-gradient-to-t from-espresso-deep/70 via-espresso-deep/10 to-transparent"
                      : w.id === "handicraft"
                        ? "bg-gradient-to-t from-espresso-deep/90 via-espresso-deep/45 to-transparent"
                        : "bg-gradient-to-t from-espresso-deep/85 via-espresso-deep/25 to-espresso-deep/10",
                  )}
                />
                <div className="absolute inset-0 bg-espresso-deep/0 transition-colors duration-1000 ease-luxe group-hover/world:bg-espresso-deep/20" />

                <div className="absolute inset-x-0 bottom-0 p-7 text-ivory transition-transform duration-1000 ease-luxe md:p-10 md:group-hover/world:-translate-y-2 lg:p-7 xl:p-10">
                  <p className="eyebrow flex items-baseline gap-3 text-gold-soft">
                    {w.eyebrow}
                    <span aria-hidden className={cn("normal-case tracking-normal", w.id === "attar" ? "font-arabic text-lg" : "font-display text-base italic")}>
                      {w.native}
                    </span>
                  </p>
                  <h3 className="mt-4 font-display text-[clamp(2.4rem,4.6vw,4.4rem)] font-light uppercase leading-[0.95] md:text-[clamp(2rem,3.6vw,3rem)] lg:text-[clamp(1.9rem,2.9vw,3.4rem)]">
                    {w.title[0]}
                    <br />
                    {w.title[1]}
                  </h3>
                  <div className="grid grid-rows-[1fr] transition-[grid-template-rows] duration-1000 ease-luxe md:grid-rows-[0fr] md:group-hover/world:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      <p className="max-w-sm pt-4 text-[0.9rem] text-ivory/75 md:opacity-0 md:transition-opacity md:duration-700 md:group-hover/world:opacity-100">{w.body}</p>
                    </div>
                  </div>
                  <span className="mt-6 inline-flex items-center gap-3 border-b border-ivory/40 pb-1.5 text-[0.7rem] font-medium uppercase tracking-[0.24em] transition-colors duration-500 group-hover/world:border-gold-soft group-hover/world:text-gold-soft">
                    {w.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover/world:translate-x-1" strokeWidth={1.3} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
