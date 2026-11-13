export function toId(value: unknown): number | null {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0 ? value : null;
  if (typeof value === "string" && /^[1-9]\d{0,15}$/.test(value.trim())) {
    const n = Number(value.trim());
    return Number.isSafeInteger(n) ? n : null;
  }
  return null;
}

export class InvalidIdError extends Error {
  constructor(what: string, value: unknown) {
    super(`Invalid ${what} id: ${String(value)}`);
    this.name = "InvalidIdError";
  }
}

export function requireId(value: unknown, what: string): number {
  const id = toId(value);
  if (id === null) throw new InvalidIdError(what, value);
  return id;
}
