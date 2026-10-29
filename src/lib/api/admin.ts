import { api, saveBlob } from "@/lib/api/client";
import type { CartDTO, CouponDTO, CouponInput, OrderDTO, OrderStatus, ProductDTO, ProductInput } from "@/lib/api/types";
import { requireId } from "@/lib/ids";

export const adminProductApi = {
  create: (p: ProductInput) => api<ProductDTO>("/api/admin/products", { method: "POST", body: p }),
  update: async (id: number, p: ProductInput) => api<ProductDTO>(`/api/admin/products/${requireId(id, "product")}`, { method: "PUT", body: p }),
  uploadImages: async (id: number, files: { blob: Blob; filename: string }[]) => {
    const form = new FormData();
    for (const f of files) form.append("image", f.blob, f.filename);
    return api<ProductDTO>(`/api/admin/products/${requireId(id, "product")}/image`, { method: "PUT", body: form, timeoutMs: 180_000 });
  },

  deleteImage: async (id: number, imageId: number) =>
    api<ProductDTO>(`/api/admin/products/${requireId(id, "product")}/images/${requireId(imageId, "image")}`, { method: "DELETE" }),

  setPrimaryImage: async (id: number, imageId: number) =>
    api<ProductDTO>(`/api/admin/products/${requireId(id, "product")}/images/${requireId(imageId, "image")}/primary`, { method: "PUT" }),

  remove: async (id: number) => api<string>(`/api/admin/products/${requireId(id, "product")}`, { method: "DELETE" }),
};

export const adminOrderApi = {
  all: () => api<OrderDTO[]>("/api/admin/orders"),
  setStatus: async (id: number, status: OrderStatus) => api<OrderDTO>(`/api/admin/orders/${requireId(id, "order")}/status`, { method: "PATCH", query: { status } }),
  downloadInvoice: async (id: number) => saveBlob(await api<Blob>(`/api/admin/orders/${requireId(id, "order")}/invoice`, { responseType: "blob" }), `CosmicLife-invoice-${id}.pdf`),
};

export const adminCouponApi = {
  all: () => api<CouponDTO[]>("/api/admin/coupons"),
  create: (c: CouponInput) => api<CouponDTO>("/api/admin/coupons", { method: "POST", body: c }),
  update: async (id: number, c: CouponInput) => api<CouponDTO>(`/api/admin/coupons/${requireId(id, "coupon")}`, { method: "PUT", body: c }),
  deactivate: async (id: number) => api<void>(`/api/admin/coupons/${requireId(id, "coupon")}`, { method: "DELETE" }),
};

export const adminCartApi = {
  all: () => api<CartDTO[]>("/api/carts"),
};
