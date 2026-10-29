import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthUser, UserInfoResponse } from "@/lib/api/auth";
import { tokenExpiry } from "@/lib/api/jwt";

export type SignOutReason = "manual" | "expired";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  expiresAt: number | null;
  endedBecause: SignOutReason | null;
  setSession: (res: UserInfoResponse) => void;
  setUser: (user: AuthUser) => void;
  clearSession: (reason?: SignOutReason) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      expiresAt: null,
      endedBecause: null,
      setSession: ({ jwtToken, ...user }) =>
        set({
          user: { id: user.id, username: user.username, email: user.email, roles: user.roles ?? [] },
          token: jwtToken,
          expiresAt: jwtToken ? tokenExpiry(jwtToken) : null,
          endedBecause: null,
        }),
      setUser: (user) => set({ user: { id: user.id, username: user.username, email: user.email, roles: user.roles ?? [] } }),
      clearSession: (reason = "manual") => set({ user: null, token: null, expiresAt: null, endedBecause: reason }),
    }),
    {
      name: "cosmic-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ user, token, expiresAt }) => ({ user, token, expiresAt }),
    },
  ),
);

export const isAdmin = (user: AuthUser | null) => !!user?.roles.includes("ROLE_ADMIN");
