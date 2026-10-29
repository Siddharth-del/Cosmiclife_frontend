import { api, ApiError } from "@/lib/api/client";
import { errorMessage } from "@/lib/errors";
import type { AddressDTO, AddressInput } from "@/lib/api/types";
import { requireId } from "@/lib/ids";

export const addressApi = {
  mine: () => api<AddressDTO[]>("/api/users/addresses"),
  get: async (id: number) => api<AddressDTO>(`/api/addresses/${requireId(id, "address")}`),
  create: (a: AddressInput) => api<AddressDTO>("/api/addresses", { method: "POST", body: a }),
  update: async (id: number, a: AddressInput) => api<AddressDTO>(`/api/addresses/${requireId(id, "address")}`, { method: "PUT", body: a }),
  remove: async (id: number) => api<string>(`/api/addresses/${requireId(id, "address")}`, { method: "DELETE" }),
};

export const EDITABLE_ADDRESS_FIELDS: readonly (keyof AddressInput)[] = ["buildingName", "street", "city", "pincode", "country"];

export function validateAddress(a: AddressInput): Partial<Record<keyof AddressInput, string>> {
  const e: Partial<Record<keyof AddressInput, string>> = {};
  const min = (k: keyof AddressInput, n: number, label: string) => {
    if (a[k].trim().length < n) e[k] = `${label} must be at least ${n} characters.`;
  };
  min("buildingName", 5, "House / building");
  min("street", 5, "Street / area");
  min("city", 4, "City");
  min("state", 2, "State");
  min("country", 2, "Country");
  min("pincode", 5, "Pincode");
  const phone = a.phoneNumber.trim();
  if (phone.length < 10 || phone.length > 15) e.phoneNumber = "Phone number must be 10 to 15 characters.";
  else if (!/^\+?[\d\s-]+$/.test(phone)) e.phoneNumber = "Use digits only (a leading + is fine).";
  if (a.pincode.trim() && !/^[A-Za-z\d\s-]+$/.test(a.pincode.trim())) e.pincode = "Use letters and digits only.";
  return e;
}

export const removeAddressError = (e: unknown) =>
  e instanceof ApiError && (e.status === 409 || e.status >= 500)
    ? "This address is linked to an order, so it's kept for that delivery and can't be removed."
    : errorMessage(e);
