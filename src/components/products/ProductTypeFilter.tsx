import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { ProductTypeDTO } from "@/lib/api/types";

export function ProductTypeFilter({
  types,
  value,
  onChange,
  counts,
  tone = "dark",
  className,
}: {
  types: ProductTypeDTO[];
  value: string | null;
  onChange: (slug: string | null) => void;
  counts?: Record<string, number>;
  tone?: "light" | "dark";
  className?: string;
}) {
  const light = tone === "light";
  const shown = types.filter((t) => t.active && (!counts || (counts[t.slug] ?? 0) > 0 || t.slug === value));
  if (shown.length < 2) return null;

  const pill = (active: boolean) =>
    cn(
      "relative inline-flex h-11 shrink-0 items-center gap-2 overflow-hidden rounded-full border px-5 text-[0.78rem] tracking-[0.04em] transition-colors duration-300",
      active
        ? light
          ? "border-ivory text-espresso"
          : "border-espresso text-ivory"
        : light
          ? "border-ivory/30 text-ivory/80 hover:border-ivory/70"
          : "border-espresso/25 text-ink hover:border-espresso/70",
    );

  return (
    <div
      role="group"
      aria-label="Filter by product type"
      className={cn("no-scrollbar -mx-gutter flex gap-2 overflow-x-auto px-gutter md:mx-0 md:flex-wrap md:overflow-visible md:px-0", className)}
    >
      <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={pill(value === null)}>
        {value === null && (
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className={cn("absolute inset-0 rounded-full", light ? "bg-ivory" : "bg-espresso")}
          />
        )}
        <span className="relative">All</span>
      </button>

      {shown.map((t) => {
        const active = value === t.slug;
        const n = counts?.[t.slug];
        return (
          <button key={t.productTypeId} type="button" aria-pressed={active} onClick={() => onChange(active ? null : t.slug)} className={pill(active)}>
            {active && (
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.35 }}
                className={cn("absolute inset-0 rounded-full", light ? "bg-ivory" : "bg-espresso")}
              />
            )}
            <span className="relative flex items-center gap-2">
              {t.name}
              {n !== undefined && <span className={cn("text-[0.68rem] tabular", active ? "opacity-70" : "opacity-45")}>{n}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
