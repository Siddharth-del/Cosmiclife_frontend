import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ArtDirectedImage } from "@/components/ui/ArtDirectedImage";
import { ButtonLink } from "@/components/ui/Button";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import type { BannerSlide } from "@/lib/api/banners";

const ROTATE_MS = 6500;
const SWIPE_THRESHOLD = 48;

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

  const light = slide.theme === "LIGHT";

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

  return (
    <section
      aria-label="Featured"
      aria-roledescription="carousel"
      className={cn("relative -mt-[4.25rem] overflow-hidden md:-mt-[4.75rem]", light ? "bg-sand text-ink" : "bg-espresso-deep text-ivory")}
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
      <div className="relative aspect-[3/4.6] max-h-[72svh] min-h-[26rem] w-full md:aspect-[2/1] md:max-h-[88vh] md:min-h-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={slide.key}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: EASE }}
          >
            <motion.div className="absolute inset-0" initial={{ scale: 1.07 }} animate={{ scale: 1 }} transition={{ duration: 7, ease: "linear" }}>
              <ArtDirectedImage
                wide={slide.imageUrl}
                narrow={slide.mobileImageUrl}
                alt={slide.alt}
                priority={index === 0}
                className="object-cover object-center"
              />
            </motion.div>
            <div
              className={cn(
                "absolute inset-0",
                light
                  ? "bg-gradient-to-b from-ivory/85 via-ivory/55 to-ivory/70 md:bg-gradient-to-r md:from-ivory/88 md:via-ivory/55 md:to-ivory/10"
                  : "bg-gradient-to-b from-espresso-deep/85 via-espresso-deep/45 to-espresso-deep/70 md:bg-gradient-to-r md:from-espresso-deep/85 md:via-espresso-deep/50 md:to-espresso-deep/10",
              )}
            />
          </motion.div>
        </AnimatePresence>

        <div aria-live="polite" aria-atomic="true" className="container-site relative z-10 flex h-full flex-col justify-start pt-[5.75rem] md:justify-center md:pt-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.key}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              <p className="sr-only">
                Slide {index + 1} of {count}
              </p>
              {slide.eyebrow && (
                <p className={cn("mb-4 text-eyebrow font-medium uppercase", light ? "text-umber" : "text-gold-soft")}>{slide.eyebrow}</p>
              )}
              {slide.heading && (
                <h1 className="max-w-[18ch] whitespace-pre-line text-[clamp(2.4rem,5.6vw,5.6rem)] font-light uppercase leading-[0.96]">{slide.heading}</h1>
              )}
              {slide.subheading && (
                <p className={cn("mt-5 max-w-sm font-display text-[1.25rem] italic md:mt-6 md:text-[1.5rem]", light ? "text-ink-muted" : "text-ivory/85")}>
                  {slide.subheading}
                </p>
              )}
              {slide.linkHref && slide.linkLabel && (
                <div className="mt-7 md:mt-9">
                  <ButtonLink href={slide.linkHref} variant={light ? "primary" : "light"} size="lg" arrow className="max-md:w-full max-md:justify-center">
                    {slide.linkLabel}
                  </ButtonLink>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {count > 1 && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 hidden items-center justify-between px-4 md:flex md:px-6">
              <CarouselArrow direction="prev" onClick={prev} light={light} />
              <CarouselArrow direction="next" onClick={next} light={light} />
            </div>

            <div className="container-site absolute inset-x-0 bottom-6 z-20 flex items-center gap-2.5">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show slide ${i + 1}${s.heading ? `, ${s.heading}` : ""}`}
                  aria-current={i === index}
                  className="group/dot py-3"
                >
                  <span
                    className={cn(
                      "block h-px w-9 transition-all duration-500",
                      i === index ? (light ? "bg-umber" : "bg-gold-soft") : light ? "bg-ink/25 group-hover/dot:bg-ink/60" : "bg-ivory/35 group-hover/dot:bg-ivory/70",
                    )}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function CarouselArrow({ direction, onClick, light }: { direction: "prev" | "next"; onClick: () => void; light: boolean }) {
  const Icon = direction === "prev" ? ArrowLeft : ArrowRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Previous slide" : "Next slide"}
      className={cn(
        "pointer-events-auto flex h-12 w-12 items-center justify-center border backdrop-blur-sm transition-colors duration-500",
        light ? "border-ink/25 text-ink/80 hover:border-ink hover:text-ink" : "border-ivory/25 text-ivory/80 hover:border-ivory hover:text-ivory",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.3} />
    </button>
  );
}
