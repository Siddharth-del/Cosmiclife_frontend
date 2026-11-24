import { isIntl } from "@/lib/market";

export const site = {
  name: "Cosmic Life",
  wordmark: "COSMIC LIFE",
  url: isIntl ? "https://cosmiclife.net" : "https://cosmiclife.in",
  domains: { IN: "https://cosmiclife.in", INTL: "https://cosmiclife.net" },
  tagline: "Crafted fragrances. Timeless identity.",
  description:
    "Cosmic Life is a fragrance house of two worlds: modern eaux de parfum and traditional attars, composed in India with materials from around the world.",
  contact: {
    email: "care@cosmiclife.in",
    phone: "+91 00000 00000",
    hours: "Monday to Saturday, 10 am – 7 pm IST",
  },
  freeShippingThreshold: isIntl ? 150 : 1499,
  shippingFee: isIntl ? 25 : 99,
  announcements: isIntl
    ? [
        "Complimentary worldwide shipping on orders above $150",
        "Secure checkout in US dollars",
      ]
    : [
        "Complimentary shipping on orders above ₹1,499",
        "Secure online payment with Razorpay, or cash on delivery",
      ],
} as const;

export type NavLink = { label: string; href: string; description?: string };

export type NavPanel = {
  eyebrow: string;
  native: string;
  blurb: string;
  cta: NavLink;
  feature: { eyebrow: string; title: string; href: string; image: string; alt: string };
};

export type NavItem = { label: string; href: string; links?: NavLink[]; panel?: NavPanel };

type NavCategory = { slug: string; name: string; description?: string | null; imageUrl?: string | null };

const PANEL_FALLBACK_IMAGE = "/images/campaign/lineup.webp";

// Pages that are not categories. Categories come from the admin panel, never from this file.
const staticNav: NavItem[] = [
  { label: "Shop All", href: "/collections/all" },
  { label: "For You", href: "/recommendations" },
  { label: "Journal", href: "/journal" },
  { label: "About", href: "/about" },
];

const stem = (v: string) => {
  const k = v.trim().toLowerCase();
  return k.length > 3 && k.endsWith("s") ? k.slice(0, -1) : k;
};

function categoryItem(c: NavCategory): NavItem {
  const href = `/collections/${c.slug}`;
  const item: NavItem = { label: c.name, href };
  if (c.description || c.imageUrl) {
    item.links = [{ label: `All ${c.name}`, href }, { label: "New Arrivals", href: "/collections/new-arrivals" }];
    item.panel = {
      eyebrow: c.name,
      native: "",
      blurb: c.description ?? "",
      cta: { label: `Shop all ${c.name}`, href },
      feature: { eyebrow: "Explore", title: c.name, href, image: c.imageUrl || PANEL_FALLBACK_IMAGE, alt: c.name },
    };
  }
  return item;
}

export function navWithCategories(categories: NavCategory[]): NavItem[] {
  const seen = new Set<string>();
  const items: NavItem[] = [];
  for (const c of categories) {
    const key = stem(c.slug) || stem(c.name);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(categoryItem(c));
  }
  return [...items, ...staticNav];
}

export const footerLinks: { title: string; links: NavLink[] }[] = [
  {
    title: "About",
    links: [
      { label: "Our Story", href: "/about" },
      { label: "Journal", href: "/journal" },
      { label: "Contact", href: "/help/contact" },
    ],
  },
  {
    title: "Customer Care",
    links: [
      { label: "Shipping", href: "/help/shipping" },
      { label: "Returns", href: "/help/returns" },
      { label: "FAQs", href: "/help/faqs" },
      { label: "Track Order", href: "/help/track-order" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/help/privacy" },
      { label: "Terms", href: "/help/terms" },
      { label: "Refund Policy", href: "/help/refund-policy" },
    ],
  },
];


/** Footer columns: a "Shop" column built from the admin categories, then the fixed help and legal columns. */
export function footerNavFor(categories: { slug: string; name: string }[]): { title: string; links: NavLink[] }[] {
  const seen = new Set<string>();
  const shop: NavLink[] = [];
  for (const c of categories) {
    const key = stem(c.slug);
    if (seen.has(key)) continue;
    seen.add(key);
    shop.push({ label: c.name, href: `/collections/${c.slug}` });
  }
  shop.push({ label: "New Arrivals", href: "/collections/new-arrivals" }, { label: "Shop All", href: "/collections/all" }, { label: "Recommendations", href: "/recommendations" });
  return [{ title: "Shop", links: shop }, ...footerLinks];
}
