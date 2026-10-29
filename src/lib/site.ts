import { isIntl } from "@/lib/market";

export const site = {
  name: "Cosmic Life",
  wordmark: "COSMIC LIFE",
  descriptor: "Parfums & Attars",
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

export const mainNav: { label: string; href: string; world?: "attar" | "perfume" | "handicraft"; links?: NavLink[]; panel?: NavPanel }[] = [
  {
    label: "Attar",
    href: "/collections/attars",
    world: "attar",
    links: [
      { label: "All Attars", href: "/collections/attars" },
      { label: "The Oud Edit", href: "/collections/oud" },
      { label: "New Arrivals", href: "/collections/new-arrivals" },
    ],
    panel: {
      eyebrow: "The Attar House",
      native: "عطر",
      blurb: "Alcohol-free perfume oils of oud, rose, saffron and earth. Worn close, made to last.",
      cta: { label: "Shop all attars", href: "/collections/attars" },
      feature: { eyebrow: "The Oud Edit", title: "Agarwood in every form", href: "/collections/oud", image: "/images/campaign/cat-attar.webp", alt: "Attars on a brass tray with oud chips" },
    },
  },
  {
    label: "Perfumes",
    href: "/collections/perfumes",
    world: "perfume",
    links: [
      { label: "All Perfumes", href: "/collections/perfumes" },
      { label: "For Him", href: "/collections/him" },
      { label: "For Her", href: "/collections/her" },
      { label: "New Arrivals", href: "/collections/new-arrivals" },
    ],
    panel: {
      eyebrow: "The Perfume House",
      native: "Parfum",
      blurb: "Eaux de parfum with clean architecture and rich materials. Made for presence, every day.",
      cta: { label: "Shop all perfumes", href: "/collections/perfumes" },
      feature: { eyebrow: "Just composed", title: "New arrivals", href: "/collections/new-arrivals", image: "/images/campaign/cat-perfume.webp", alt: "Three flacons on stepped travertine blocks" },
    },
  },
  {
    label: "Handicraft",
    href: "/collections/handicraft",
    world: "handicraft",
    links: [
      { label: "All Handicrafts", href: "/collections/handicraft" },
      { label: "Brass", href: "/collections/handicraft?material=brass" },
      { label: "Copper", href: "/collections/handicraft?material=copper" },
      { label: "Others", href: "/collections/handicraft?material=others" },
    ],
    panel: {
      eyebrow: "The Handicraft Collection",
      native: "Dastkārī",
      blurb: "Brass, copper and other metals shaped by hand: they warm to the touch and age to a soft glow.",
      cta: { label: "Shop all handicrafts", href: "/collections/handicraft" },
      feature: { eyebrow: "In brass", title: "Stands and glasses", href: "/collections/handicraft?material=brass", image: "/images/campaign/cat-handicraft.webp", alt: "Hammered brass glasses beside a turned brass stand" },
    },
  },
  { label: "Shop All", href: "/collections/all" },
  { label: "Journal", href: "/journal" },
  { label: "About", href: "/about" },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Perfumes", href: "/collections/perfumes" },
      { label: "Attars", href: "/collections/attars" },
      { label: "Handicrafts", href: "/collections/handicraft" },
      { label: "New Arrivals", href: "/collections/new-arrivals" },
      { label: "Shop All", href: "/collections/all" },
    ],
  },
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
