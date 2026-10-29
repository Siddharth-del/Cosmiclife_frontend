export type Market = "IN" | "INTL";

function detect(): Market {
  const forced = import.meta.env.VITE_MARKET as string | undefined;
  if (forced === "IN" || forced === "INTL") return forced;
  if (typeof window !== "undefined" && /(^|\.)cosmiclife\.net$/i.test(window.location.hostname)) return "INTL";
  return "IN";
}

export const market: Market = detect();
export const isIntl = market === "INTL";
export const currencyCode = isIntl ? "USD" : "INR";
export const moneyLocale = isIntl ? "en-US" : "en-IN";
