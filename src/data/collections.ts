import type { Collection } from "@/types";

const c = (src: string, alt: string, width = 1200, height = 1500) => ({ src, alt, width, height });

/**
 * Virtual collections only. Real categories (Attar, Perfume, Electronics, ...) are created by the admin
 * and loaded from the API; they are never listed here.
 */
export const collections: Collection[] = [
  {
    slug: "new-arrivals",
    title: "New Arrivals",
    eyebrow: "Just added",
    description: "The latest pieces to join the house.",
    theme: "light",
    image: c("/images/campaign/new-arrival.webp", "A Cosmic Life flacon on a round travertine plinth"),
  },
  {
    slug: "all",
    title: "Shop All",
    eyebrow: "Shop all",
    description: "Everything in the house, in one place.",
    theme: "light",
    image: c("/images/campaign/lineup.webp", "A row of Cosmic Life flacons on a travertine shelf", 1600, 1000),
    banner: c("/images/campaign/lineup.webp", "A row of Cosmic Life flacons on a travertine shelf", 1600, 1000),
  },
];
