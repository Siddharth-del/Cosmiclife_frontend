import { api, saveBlob } from "@/lib/api/client";
import type { OrderDTO } from "@/lib/api/types";
import { requireId } from "@/lib/ids";

export const orderApi = {
  mine: () => api<OrderDTO[]>("/api/orders"),
  get: async (id: number) => api<OrderDTO>(`/api/orders/${requireId(id, "order")}`),
  downloadInvoice: async (id: number) => saveBlob(await api<Blob>(`/api/orders/${requireId(id, "order")}/invoice`, { responseType: "blob" }), `CosmicLife-invoice-${id}.pdf`),
};
