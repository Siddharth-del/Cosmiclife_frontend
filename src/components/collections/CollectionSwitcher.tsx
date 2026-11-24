import { motion } from "framer-motion";
import Link from "@/components/ui/Link";
import { cn } from "@/lib/cn";

export interface SwitcherItem {
  id: string;
  label: string;
  href: string;
}

interface Props {
  items: SwitcherItem[];
  value?: string;
  onChange?: (id: string) => void;
  tone?: "light" | "dark";
  className?: string;
  id?: string;
}

/** Tabs for the admin's categories: as many as exist, scrolling sideways when they do not fit. */
export function CollectionSwitcher({ items, value, onChange, tone = "dark", className, id = "collection" }: Props) {
  const light = tone === "light";
  return (
    <div
      role={onChange ? "tablist" : undefined}
      aria-label="Choose a collection"
      className={cn("no-scrollbar relative flex max-w-full overflow-x-auto border p-1", light ? "border-ivory/25" : "border-espresso/20", className)}
    >
      {items.map((w) => {
        const active = w.id === value;
        const inner = (
          <>
            {active && (
              <motion.span layoutId={`${id}-pill`} className={cn("absolute inset-0", light ? "bg-ivory" : "bg-espresso")} transition={{ type: "spring", stiffness: 380, damping: 36 }} />
            )}
            <span className="relative">{w.label}</span>
          </>
        );
        const cls = cn(
          "relative flex h-11 shrink-0 items-center justify-center px-5 text-[0.68rem] font-medium uppercase tracking-[0.24em] transition-colors duration-500 sm:min-w-[8.5rem]",
          active ? (light ? "text-espresso" : "text-ivory") : light ? "text-ivory/75 hover:text-ivory" : "text-espresso/70 hover:text-espresso",
        );
        return onChange ? (
          <button key={w.id} type="button" role="tab" aria-selected={active} className={cls} onClick={() => onChange(w.id)}>
            {inner}
          </button>
        ) : (
          <Link key={w.id} href={w.href} aria-current={active ? "page" : undefined} className={cls}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
