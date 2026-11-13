const KEY = "cosmic-pending-payment";
export const PAYMENT_WINDOW_MINUTES = 15;

export interface PendingPayment {
  orderId: number;
  razorpayOrderId: string;
  keyId: string;
  amount: number;
  currency: string;
  email: string;
  bag: string;
  createdAt: number;
}

export function readPending(): PendingPayment | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as PendingPayment | null;
    if (!v || Date.now() - v.createdAt > PAYMENT_WINDOW_MINUTES * 60_000) return null;
    return v;
  } catch {
    return null;
  }
}

export function savePending(p: PendingPayment) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch (ignored) {
    void ignored;
  }
}

export function clearPending() {
  try {
    sessionStorage.removeItem(KEY);
  } catch (ignored) {
    void ignored;
  }
}
