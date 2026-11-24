import { currencyCode, moneyLocale } from "@/lib/market";

const money = new Intl.NumberFormat(moneyLocale, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 });

export const formatPrice = (value: number) => money.format(value);

export const discountPercent = (price: number, compareAt?: number) =>
  compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

export const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n));

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(moneyLocale, { day: "numeric", month: "long", year: "numeric" });
