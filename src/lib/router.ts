import { data } from "react-router";

export function notFound(): never {
  throw data("Not found", { status: 404 });
}

export function safeNext(value: string | null | undefined, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
