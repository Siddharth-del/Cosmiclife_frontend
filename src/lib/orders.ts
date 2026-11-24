import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/api/types";
import { currencyCode, moneyLocale } from "@/lib/market";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  CREATED: "Not paid yet",
  CAPTURED: "Paid online",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
  PENDING_COD: "Pay on delivery",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  RAZORPAY: "Online (Razorpay)",
  UPI: "Online (Razorpay)",
  COD: "Cash on delivery",
};

export type StatusTone = "neutral" | "progress" | "good" | "bad";

export const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  PENDING_PAYMENT: "neutral",
  PAID: "progress",
  CONFIRMED: "progress",
  SHIPPED: "progress",
  DELIVERED: "good",
  CANCELLED: "bad",
  REFUNDED: "bad",
};

export function formatDateTime(value: string | null | undefined, withTime = true) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(moneyLocale, withTime ? { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" });
}

const formatters = new Map<string, { whole: Intl.NumberFormat; fraction: Intl.NumberFormat }>();

function formatterFor(code: string) {
  let pair = formatters.get(code);
  if (!pair) {
    const locale = code === "USD" ? "en-US" : "en-IN";
    pair = {
      whole: new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumFractionDigits: 0 }),
      fraction: new Intl.NumberFormat(locale, { style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };
    formatters.set(code, pair);
  }
  return pair;
}

export const formatPaise = (p: number | null | undefined, code: string = currencyCode) => {
  const v = (p ?? 0) / 100;
  const pair = formatterFor(code);
  return Number.isInteger(v) ? pair.whole.format(v) : pair.fraction.format(v);
};
