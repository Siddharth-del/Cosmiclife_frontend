export type CategoryEnum = "ATTAR" | "PERFUME" | "HANDICRAFT";
export type MaterialEnum = "COPPER" | "BRASS" | "OTHERS";
export type GenderEnum = "MEN" | "WOMEN" | "UNISEX";
export type FragranceFamilyEnum = "AMBER" | "AQUATIC" | "AROMATIC" | "EARTHY" | "FLORAL" | "MIXED" | "WOODY";
export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
export type PaymentMethod = "RAZORPAY" | "COD" | "UPI";
export type PaymentStatus = "CREATED" | "CAPTURED" | "FAILED" | "REFUNDED" | "PENDING_COD";
export type DiscountType = "PERCENT" | "FLAT";

export const CATEGORIES: CategoryEnum[] = ["PERFUME", "ATTAR", "HANDICRAFT"];
export const MATERIALS: MaterialEnum[] = ["BRASS", "COPPER", "OTHERS"];
export const GENDERS: GenderEnum[] = ["MEN", "WOMEN", "UNISEX"];
export const FRAGRANCE_FAMILIES: FragranceFamilyEnum[] = ["AMBER", "AQUATIC", "AROMATIC", "EARTHY", "FLORAL", "MIXED", "WOODY"];
export const ORDER_STATUSES: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export interface ProductImageDTO {
  imageId: number;
  imageUrl: string;
  sortOrder: number;
}

export interface ProductDTO {
  productId: number;
  name: string;
  slug: string;
  description: string | null;
  category: CategoryEnum | null;
  material?: MaterialEnum | null;
  gender: GenderEnum | null;
  fragranceFamily: FragranceFamilyEnum | null;
  quantity: number | null;
  mrp: number | null;
  price: number | null;
  discount: number | null;
  mrpUsd?: number | null;
  priceUsd?: number | null;
  discountUsd?: number | null;
  stock: number | null;
  image: string | null;
  images?: ProductImageDTO[] | null;
  active: boolean | null;
}

export interface ProductResponse {
  content: ProductDTO[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  lastPage: boolean;
}

export type ProductInput = Omit<ProductDTO, "productId" | "quantity" | "discount" | "discountUsd" | "image" | "images"> & { image?: string | null };

export interface CartDTO {
  cartId: number;
  totalPrice: number;
  products: ProductDTO[];
}

export interface AddressDTO {
  addressId: number;
  street: string;
  buildingName: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phoneNumber: string;
}
export type AddressInput = Omit<AddressDTO, "addressId">;

export interface PriceBreakdown {
  subtotal: number;
  mrpTotal: number;
  productSavings: number;
  couponDiscount: number;
  couponCode: string | null;
  couponMessage: string | null;
  shipping: number;
  total: number;
}

export interface CheckoutRequest {
  addressId: number;
  paymentMethod: "RAZORPAY" | "COD";
  couponCode?: string;
  market?: "IN" | "INTL";
}

export interface CheckoutResponse {
  orderId: number;
  status: OrderStatus;
  price: PriceBreakdown | null;
  razorpayKeyId: string | null;
  razorpayOrderId: string | null;
  amount: number | null;
  currency: string | null;
  customerEmail: string | null;
}

export interface PaymentVerifyRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface OrderItemDTO {
  orderItemId: number;
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  mrp: number | null;
  lineTotal: number;
}

export interface OrderDTO {
  orderId: number;
  email: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus | null;
  subtotal: number;
  discount: number | null;
  shipping: number;
  total: number;
  couponCode: string | null;
  market?: "IN" | "INTL" | null;
  currency?: string | null;
  addressId: number | null;
  createdAt: string;
  paidAt: string | null;
  orderItems: OrderItemDTO[];
}

export interface CouponDTO {
  couponId: number;
  code: string;
  type: DiscountType;
  value: number;
  minOrderPaise: number | null;
  maxDiscountPaise: number | null;
  usageLimit: number | null;
  usedCount: number | null;
  validFrom: string | null;
  validTo: string | null;
  active: boolean | null;
}
export type CouponInput = Omit<CouponDTO, "couponId" | "usedCount">;

export const ORDER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PAID: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
};

export const invoiceAvailable = (status: OrderStatus) => status !== "PENDING_PAYMENT" && status !== "CANCELLED";

export const paise = (rupees: number) => Math.round(rupees * 100);
export const toMinorUnits = (major: number) => Math.round(major * 100);
export const fromMinorUnits = (minor: number | null | undefined) => (minor ?? 0) / 100;
export const rupees = (p: number | null | undefined) => (p ?? 0) / 100;

export interface UserDTO {
  userId?: number | null;
  userName?: string | null;
  email?: string | null;
  id?: number | null;
  username?: string | null;
  roles?: (string | { roleId?: number; roleName?: string })[] | null;
}

export interface UserResponseDTO {
  content: UserDTO[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  lastPage: boolean;
}

export interface AdminUser {
  userId: number | null;
  username: string;
  email: string;
  roles: string[];
  admin: boolean;
}

const roleName = (r: string | { roleId?: number; roleName?: string }): string =>
  typeof r === "string" ? r : (r?.roleName ?? "");

export function normaliseUser(u: UserDTO): AdminUser {
  const roles = (u.roles ?? []).map(roleName).filter(Boolean).map((r) => r.toUpperCase());
  return {
    userId: u.userId ?? u.id ?? null,
    username: (u.username ?? u.userName ?? "").trim(),
    email: (u.email ?? "").trim(),
    roles,
    admin: roles.some((r) => r === "ROLE_ADMIN" || r === "ADMIN"),
  };
}

export const roleLabel = (role: string) => {
  const base = role.replace(/^ROLE_/, "").toLowerCase();
  return base ? base[0].toUpperCase() + base.slice(1) : role;
};

