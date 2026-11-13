import { api } from "@/lib/api/client";
import { BANNER_PLACEMENTS } from "@/lib/api/types";
import type { BannerDTO, BannerImageDTO, BannerMap, BannerPlacement, BannerTheme } from "@/lib/api/types";

export interface BannerSlide {
  key: string;
  bannerId: number;
  imageId: number;
  imageUrl: string;
  mobileImageUrl: string;
  alt: string;
  eyebrow: string | null;
  heading: string | null;
  subheading: string | null;
  linkHref: string | null;
  linkLabel: string | null;
  theme: BannerTheme;
}

export function emptyBannerMap(): BannerMap {
  return Object.fromEntries(BANNER_PLACEMENTS.map((p) => [p, [] as BannerDTO[]])) as BannerMap;
}

export function normaliseBanners(raw: unknown): BannerMap {
  const map = emptyBannerMap();
  if (!raw || typeof raw !== "object") return map;

  if (Array.isArray(raw)) {
    if (raw.length && import.meta.env.DEV) {
      console.warn("[banners] the server returned a flat list; this frontend expects banners keyed by placement, each with an images array. Update the banner backend.");
    }
    for (const banner of raw as BannerDTO[]) {
      const placement = placementOf(banner);
      map[placement].push(banner);
    }
  } else {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const placement = asPlacement(key);
      if (!placement || !Array.isArray(value)) continue;
      map[placement].push(...(value as BannerDTO[]));
    }
  }

  for (const placement of BANNER_PLACEMENTS) {
    map[placement] = map[placement].filter(hasImages).sort(byDisplayOrder);
  }
  return map;
}

export function fetchBanners(signal?: AbortSignal): Promise<BannerMap> {
  return api<unknown>("/api/public/banners", { auth: false, signal }).then(normaliseBanners);
}

export function bannerIsLive(b: BannerDTO, now = Date.now()): boolean {
  if (b.active === false) return false;
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return false;
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return false;
  return true;
}

export const byDisplayOrder = (a: BannerDTO, b: BannerDTO) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.bannerId - b.bannerId;

export function bannerSlides(banners: BannerDTO[]): BannerSlide[] {
  const slides: BannerSlide[] = [];
  for (const banner of banners) {
    for (const image of images(banner)) {
      slides.push({
        key: `${banner.bannerId}-${image.imageId}`,
        bannerId: banner.bannerId,
        imageId: image.imageId,
        imageUrl: image.imageUrl,
        mobileImageUrl: image.mobileImageUrl || image.imageUrl,
        alt: image.decorative ? "" : (image.altText ?? banner.heading ?? ""),
        eyebrow: image.eyebrow ?? banner.eyebrow,
        heading: image.heading ?? banner.heading,
        subheading: image.subheading ?? banner.subheading,
        linkHref: image.linkHref ?? banner.ctaHref,
        linkLabel: image.linkLabel ?? banner.ctaLabel,
        theme: banner.theme === "LIGHT" ? "LIGHT" : "DARK",
      });
    }
  }
  return slides;
}

function images(banner: BannerDTO): BannerImageDTO[] {
  return [...(banner.images ?? [])].filter((i) => !!i.imageUrl).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.imageId - b.imageId);
}

function hasImages(banner: BannerDTO): boolean {
  return images(banner).length > 0;
}

function asPlacement(value: string): BannerPlacement | null {
  const upper = value.trim().toUpperCase();
  return (BANNER_PLACEMENTS as readonly string[]).includes(upper) ? (upper as BannerPlacement) : null;
}

function placementOf(banner: BannerDTO): BannerPlacement {
  return asPlacement(String(banner.placement ?? "")) ?? "HERO";
}
