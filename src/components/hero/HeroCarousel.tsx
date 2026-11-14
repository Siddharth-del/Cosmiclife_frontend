import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArtDirectedImage } from "@/components/ui/ArtDirectedImage";
import Link from "@/components/ui/Link";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import type { BannerSlide } from "@/lib/api/banners";

const ROTATE_MS = 5000;
const SWIPE_THRESHOLD = 48;

/*
  BANNER SIZE (Myntra / Amazon / Flipkart style)
  - Full-width, edge to edge, directly under the navbar.
  - Image only: all text lives inside the banner artwork, nothing is overlaid.
  - Arrows appear on hover; dots stay visible at the bottom.
  - Whole banner is clickable (uses the slide's linkHref).
  - Sits BELOW the navbar, so the navbar never covers it.

  The desktop ratio is 2:1 so your current artwork is shown in full, with nothing cropped.
  Image sizes that match:
    Desktop: 1600 x 800 px  (2:1)   -> md:aspect-[2/1]
    Mobile :  800 x 450 px  (16:9)  -> aspect-[16/9]
  For a slimmer Flipkart-style banner, re-export the artwork at 1600 x 533 px (3:1)
  and change md:aspect-[2/1] to md:aspect-[3/1].
*/
const BOX = "relative aspect-[16/9] w-full md:aspect-[2/1]";

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function HeroCarousel({ slides }: { slides: BannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return;
    const timer = setTimeout(() => go(index + 1), ROTATE_MS);
    return () => clearTimeout(timer);
  }, [index, count, paused, go]);

  const slide = slides[index];
  if (!slide) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    if (start == null || count < 2) return;
    const delta = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta < 0) next();
    else prev();
  };

  const picture = (
    <ArtDirectedImage
      wide={slide.imageUrl}
      narrow={slide.mobileImageUrl || slide.imageUrl}
      alt={slide.alt || slide.heading || "Featured banner"}
      priority={index === 0}
      className="object-cover object-center"
    />
  );

  return (
    <section
      aria-label="Featured"
      aria-roledescription="carousel"
      className="relative bg-sand"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
      }}
    >
      <div className="group/hero relative mx-auto w-full max-w-[1600px] overflow-hidden">
        <div className={BOX} aria-live="polite" aria-atomic="true">
          <AnimatePresence initial={false}>
            <motion.div
              key={slide.key}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <p className="sr-only">
                Slide {index + 1} of {count}
                {slide.heading ? `: ${slide.heading}` : ""}
              </p>
              {slide.linkHref ? (
                <Link href={slide.linkHref} aria-label={slide.linkLabel || slide.heading || "View offer"} className="absolute inset-0 block">
                  {picture}
                </Link>
              ) : (
                picture
              )}
            </motion.div>
          </AnimatePresence>

          {count > 1 && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 hidden items-center justify-between opacity-0 transition-opacity duration-300 group-hover/hero:opacity-100 focus-within:opacity-100 md:flex">
                <CarouselArrow direction="prev" onClick={prev} />
                <CarouselArrow direction="next" onClick={next} />
              </div>

              <div className="absolute inset-x-0 bottom-2 z-20 flex items-center justify-center gap-1.5 md:bottom-3">
                {slides.map((s, i) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Show slide ${i + 1}${s.heading ? `, ${s.heading}` : ""}`}
                    aria-current={i === index}
                    className="p-1"
                  >
                    <span className={cn("block h-1.5 rounded-full shadow-sm transition-all duration-300", i === index ? "w-5 bg-white" : "w-1.5 bg-white/55 hover:bg-white/80")} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function CarouselArrow({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Previous slide" : "Next slide"}
      className={cn(
        "pointer-events-auto flex h-20 w-9 items-center justify-center bg-white/85 text-espresso shadow-md transition-colors duration-300 hover:bg-white lg:w-11",
        direction === "prev" ? "rounded-r" : "rounded-l",
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={1.5} />
    </button>
  );
}
