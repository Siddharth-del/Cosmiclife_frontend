import { api, saveBlob } from "@/lib/api/client";
import type { APIResponse, BannerDTO, BannerImageInput, BannerImageUploadResponse, BannerInput, CartDTO, CategoryInput, CouponDTO, CouponInput, OrderDTO, OrderStatus, ProductDTO, ProductInput, ProductTypeDTO, ProductTypeInput } from "@/lib/api/types";
import { fetchProductTypePage, normaliseProductType, productTypeAdminPath, productTypeCreatePath, toProductTypeBody, type RawProductType } from "@/lib/api/productTypes";
import { requireId } from "@/lib/ids";
import { fetchCategoryPage, normaliseCategory, toCategoryBody, type RawCategory } from "@/lib/api/categories";

export const adminProductApi = {
  create: (p: ProductInput) =>
    api<ProductDTO>(`/api/admin/${requireId(p.categoryId, "category")}/products`, { method: "POST", body: p }),
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

export const adminCategoryApi = {
  all: () => fetchCategoryPage(true),
  create: async (c: CategoryInput) =>
    normaliseCategory(await api<RawCategory>("/api/admin/categories", { method: "POST", body: toCategoryBody(c) })),
  update: async (id: number, c: CategoryInput) =>
    normaliseCategory(
      await api<RawCategory>(`/api/admin/category/${requireId(id, "category")}`, { method: "PUT", body: toCategoryBody(c) }),
    ),
  remove: async (id: number) =>
    api<string>(`/api/admin/category/${requireId(id, "category")}`, { method: "DELETE" }),
  uploadIcon: async (id: number, image: { blob: Blob; filename: string }) => {
    const form = new FormData();
    form.append("file", image.blob, image.filename);
    return normaliseCategory(
      await api<RawCategory>(`/api/admin/categoryIcon/${requireId(id, "category")}`, {
        method: "PUT",
        body: form,
        timeoutMs: 180_000,
      }),
    );
  },
};

const bannerPath = (id: number) => `/api/admin/banners/${requireId(id, "banner")}`;
const imagePath = (id: number, imageId: number) => `${bannerPath(id)}/images/${requireId(imageId, "image")}`;

export const adminBannerApi = {
  all: (placement?: string) => api<BannerDTO[]>("/api/admin/banners", { query: { placement } }),
  one: (id: number) => api<BannerDTO>(bannerPath(id)),
  create: (b: BannerInput) => api<BannerDTO>("/api/admin/banners", { method: "POST", body: b }),
  update: async (id: number, b: BannerInput) => api<BannerDTO>(bannerPath(id), { method: "PUT", body: b }),
  setActive: async (id: number, active: boolean) => api<BannerDTO>(`${bannerPath(id)}/active`, { method: "PATCH", query: { active: String(active) } }),
  reorder: (placement: string, ids: number[]) => api<BannerDTO[]>("/api/admin/banners/reorder", { method: "PUT", body: { placement, ids } }),
  remove: async (id: number) => api<APIResponse>(bannerPath(id), { method: "DELETE" }),

  uploadImages: async (id: number, files: File[]) => {
    const form = new FormData();
    for (const file of files) form.append("images", file, file.name);
    return api<BannerImageUploadResponse>(`${bannerPath(id)}/images`, { method: "POST", body: form, timeoutMs: 180_000 });
  },
  replaceImage: async (id: number, imageId: number, file: File) => {
    const form = new FormData();
    form.append("image", file, file.name);
    return api<BannerDTO>(`${imagePath(id, imageId)}/file`, { method: "PUT", body: form, timeoutMs: 180_000 });
  },
  setMobileImage: async (id: number, imageId: number, file: File) => {
    const form = new FormData();
    form.append("image", file, file.name);
    return api<BannerDTO>(`${imagePath(id, imageId)}/mobile`, { method: "PUT", body: form, timeoutMs: 180_000 });
  },
  removeMobileImage: async (id: number, imageId: number) => api<BannerDTO>(`${imagePath(id, imageId)}/mobile`, { method: "DELETE" }),
  updateImage: async (id: number, imageId: number, input: BannerImageInput) => api<BannerDTO>(imagePath(id, imageId), { method: "PUT", body: input }),
  reorderImages: async (id: number, ids: number[]) => api<BannerDTO>(`${bannerPath(id)}/images/reorder`, { method: "PUT", body: { ids } }),
  removeImage: async (id: number, imageId: number) => api<BannerDTO>(imagePath(id, imageId), { method: "DELETE" }),
};

export const adminProductTypeApi = {
  all: () => fetchProductTypePage(true),
  create: (categoryId: number, t: ProductTypeInput) =>
    api<RawProductType>(productTypeCreatePath(requireId(categoryId, "category")), {
      method: "POST",
      body: toProductTypeBody({ ...t, categoryId }),
    }).then(normaliseProductType),
  update: async (id: number, t: ProductTypeInput) =>
    api<RawProductType>(productTypeAdminPath(requireId(id, "product type")), { method: "PUT", body: toProductTypeBody(t) }).then(normaliseProductType),
  setActive: async (t: ProductTypeDTO, active: boolean) =>
    adminProductTypeApi.update(t.productTypeId, {
      name: t.name,
      slug: t.slug,
      displayOrder: t.displayOrder,
      active,
      categoryId: t.categoryId,
    }),
  remove: async (id: number) =>
    api<APIResponse | string>(productTypeAdminPath(requireId(id, "product type")), { method: "DELETE" }),
};

export const adminCartApi = {
  all: () => api<CartDTO[]>("/api/carts"),
};
