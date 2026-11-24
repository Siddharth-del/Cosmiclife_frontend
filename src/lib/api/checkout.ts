import { api } from "@/lib/api/client";
import type { CheckoutRequest, CheckoutResponse, PaymentVerifyRequest, PriceBreakdown } from "@/lib/api/types";
import { market } from "@/lib/market";

export const checkoutApi = {
  preview: (coupon?: string) => api<PriceBreakdown>("/api/checkout/preview", { query: { coupon: coupon?.trim() || undefined, market } }),
  place: (req: CheckoutRequest) => api<CheckoutResponse>("/api/checkout", { method: "POST", body: req }),
  verify: (req: PaymentVerifyRequest) => api<CheckoutResponse>("/api/payments/verify", { method: "POST", body: req }),
};
