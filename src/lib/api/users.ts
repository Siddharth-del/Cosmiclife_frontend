import { api } from "@/lib/api/client";
import type { UserDTO, UserResponseDTO } from "@/lib/api/types";
import { requireId } from "@/lib/ids";

export interface UserPageQuery {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  signal?: AbortSignal;
}

const PAGE_SIZE = 20;

const pageQuery = (q: UserPageQuery = {}) => ({
  pageNumber: q.pageNumber ?? 0,
  pageSize: q.pageSize ?? PAGE_SIZE,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
});

const safeUser = (u: UserDTO & { password?: unknown }): UserDTO => ({
  userId: u.userId ?? null,
  userName: u.userName ?? null,
  email: u.email ?? null,
  ...(u.id != null ? { id: u.id } : {}),
  ...(u.username != null ? { username: u.username } : {}),
  ...(Array.isArray(u.roles) ? { roles: u.roles } : {}),
});

const safePage = (r: UserResponseDTO): UserResponseDTO => ({ ...r, content: (r.content ?? []).map(safeUser) });

export const adminUserApi = {
  list: async (q: UserPageQuery = {}) => safePage(await api<UserResponseDTO>("/api/admin/users", { query: pageQuery(q), signal: q.signal })),

  search: async (username: string, q: UserPageQuery = {}) =>
    safePage(await api<UserResponseDTO>(`/api/admin/users/${encodeURIComponent(username.trim())}`, { query: pageQuery(q), signal: q.signal })),

  byId: async (userId: number, signal?: AbortSignal) => safeUser(await api<UserDTO>(`/api/admin/users/userId/${requireId(userId, "user")}`, { signal })),
};
