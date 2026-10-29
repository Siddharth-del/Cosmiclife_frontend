import { useAuth } from "@/store/auth";
import { InvalidIdError } from "@/lib/ids";

const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  auth?: boolean;
  responseType?: "json" | "blob";
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function apiUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(BASE + path, window.location.origin);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  return url;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, responseType = "json", signal, timeoutMs = 60_000 } = opts;
  const url = apiUrl(path, query);

  const headers: Record<string, string> = { Accept: responseType === "blob" ? "application/pdf, */*" : "application/json, text/plain;q=0.9, */*;q=0.8" };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const token = auth ? useAuth.getState().token : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      credentials: "omit",
      signal: controller.signal,
    });
  } catch {
    if (signal?.aborted) throw new ApiError("Request cancelled.", 0);
    if (controller.signal.aborted) throw new ApiError("The server took too long to respond. Please try again.", 0);
    throw new ApiError("We couldn't reach the server. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }

  const type = res.headers.get("content-type") ?? "";
  if (type.includes("text/html")) {
    throw new ApiError("The store isn't connected to its server: /api requests are returning the website. Check the /api rewrite rule.", 502);
  }

  if (res.ok && responseType === "blob") return (await res.blob()) as T;

  const text = await res.text();
  let payload: unknown = text;
  if (text && type.includes("json")) {
    try {
      payload = JSON.parse(text);
    } catch (ignored) {
      void ignored;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && token) throw await sessionError(token, payload, path);
    if (res.status === 401 && isPublicPath(path) && isSecurityBoilerplate(payload)) throw new ApiError(GENERIC[500], 500);
    throw toApiError(payload, res.status);
  }
  return payload as T;
}

const isPublicPath = (path: string) => path.startsWith("/api/auth/") || path.startsWith("/api/public/");

function isSecurityBoilerplate(payload: unknown) {
  if (!payload || typeof payload !== "object") return !payload;
  const msg = (payload as { message?: unknown }).message;
  return (payload as { error?: unknown }).error === "Unauthorized" || (typeof msg === "string" && /full authentication is required/i.test(msg));
}

async function sessionError(token: string, payload: unknown, path: string): Promise<ApiError> {
  const { expiresAt, clearSession } = useAuth.getState();
  let valid = !(expiresAt && expiresAt <= Date.now());
  let roles: string[] | null = null;
  if (valid) {
    try {
      const r = await fetch(apiUrl("/api/auth/user"), { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, credentials: "omit" });
      valid = r.ok;
      if (r.ok) roles = ((await r.json().catch(() => null)) as { roles?: string[] } | null)?.roles ?? null;
    } catch {
      valid = true;
    }
  }
  if (!valid) {
    if (useAuth.getState().token === token) clearSession("expired");
    return new ApiError("Your session has ended. Please sign in again.", 401);
  }
  if (path.startsWith("/api/admin/") && roles && !roles.includes("ROLE_ADMIN")) return new ApiError(GENERIC[403], 403);
  const msg = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string" ? (payload as { message: string }).message : "";
  return new ApiError(
    msg && !/full authentication is required/i.test(msg) ? msg : "The server couldn't complete that request. Check the details and try again.",
    500,
  );
}

const GENERIC: Record<number, string> = {
  401: "Please sign in to continue.",
  403: "You don't have permission to do that.",
  404: "We couldn't find that.",
  409: "That conflicts with a recent change. Please refresh and try again.",
  413: "That file is too large.",
  500: "Something went wrong on our side. Please try again in a moment.",
  502: "The server isn't responding right now. Please try again in a minute.",
  503: "The server isn't responding right now. Please try again in a minute.",
  504: "The server took too long to respond. Please try again.",
};

function toApiError(payload: unknown, status: number): ApiError {
  if (typeof payload === "string") {
    const s = payload.trim();
    const usable = s && s.length < 240 && !s.startsWith("<");
    return new ApiError(usable ? s : (GENERIC[status] ?? GENERIC[500]), status);
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message && !/full authentication is required|access denied/i.test(obj.message)) {
      return new ApiError(obj.message, status);
    }
    const fields = Object.fromEntries(Object.entries(obj).filter(([k, v]) => typeof v === "string" && !["error", "path", "timestamp", "message"].includes(k))) as Record<string, string>;
    if (status === 400 && Object.keys(fields).length) {
      return new ApiError(Object.entries(fields).map(([k, v]) => `${k[0].toUpperCase()}${k.slice(1)} ${v}`).join(". ") + ".", status, fields);
    }
  }
  return new ApiError(GENERIC[status] ?? (status >= 500 ? GENERIC[500] : "Something went wrong. Please try again."), status);
}

export type ErrorKind = "session" | "forbidden" | "not-found" | "invalid" | "conflict" | "server" | "network";

export function errorKind(e: unknown): ErrorKind {
  if (e instanceof InvalidIdError) return "invalid";
  if (!(e instanceof ApiError)) return "server";
  if (e.status === 0) return "network";
  if (e.status === 401) return "session";
  if (e.status === 403) return "forbidden";
  if (e.status === 404) return "not-found";
  if (e.status === 409) return "conflict";
  if (e.status >= 400 && e.status < 500) return "invalid";
  return "server";
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
