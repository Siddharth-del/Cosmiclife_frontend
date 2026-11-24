import Link from "@/components/ui/Link";
import { X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { navWithCategories, footerLinks, site } from "@/lib/site";
import { useCategories } from "@/hooks/useCategories";
import { useUI } from "@/store/ui";
import { isAdmin, useAuth } from "@/store/auth";
import { useMemo } from "react";
import { cn } from "@/lib/cn";

export function MobileMenu() {
  const open = useUI((s) => s.menuOpen);
  const setMenu = useUI((s) => s.setMenu);
  const user = useAuth((s) => s.user);
  const categories = useCategories();
  const nav = useMemo(() => navWithCategories(categories), [categories]);
  const isCategory = (href: string) => href.startsWith("/collections/") && href !== "/collections/all";
  const categoryLinks = nav.filter((n) => isCategory(n.href));
  const otherLinks = nav.filter((n) => !isCategory(n.href));
  return (
    <Sheet open={open} onClose={() => setMenu(false)} side="left" label="Menu" className="max-w-none sm:max-w-[26rem]">
      <div className="flex items-center justify-between px-gutter pb-2 pt-5">
        <span className="label text-ink-muted">Menu</span>
        <button type="button" onClick={() => setMenu(false)} aria-label="Close menu" className="ml-3 flex h-11 w-11 shrink-0 items-center justify-center">
          <X className="h-5 w-5" strokeWidth={1.3} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-gutter pb-10 pt-4">
        {categoryLinks.length > 0 && (
          <ul className="border-t border-hair">
            {categoryLinks.map((l) => (
              <li key={l.href} className="border-b border-hair">
                <Link href={l.href} onClick={() => setMenu(false)} className="flex items-center justify-between py-4 font-display text-[1.6rem] uppercase tracking-[0.06em]">
                  {l.label}
                  <span aria-hidden className="text-[0.7rem] text-gold-deep">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <ul className={categoryLinks.length ? "mt-8 space-y-1" : "space-y-1 border-t border-hair pt-4"}>
          {otherLinks.map((n) => (
            <li key={n.href}>
              <Link href={n.href} onClick={() => setMenu(false)} className="block py-2.5 font-sans text-[0.8rem] font-medium uppercase tracking-[0.2em]">
                {n.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/account" onClick={() => setMenu(false)} className="block py-2.5 font-sans text-[0.8rem] font-medium uppercase tracking-[0.2em]">
              {user ? `Account · ${user.username}` : "Sign in"}
            </Link>
          </li>
          {isAdmin(user) && (
            <li>
              <Link href="/admin" onClick={() => setMenu(false)} className="block py-2.5 font-sans text-[0.8rem] font-medium uppercase tracking-[0.2em] text-gold-deep">
                Admin panel
              </Link>
            </li>
          )}
        </ul>

        <div className="mt-10 grid grid-cols-2 gap-6 border-t border-hair pt-8 text-[0.8rem]">
          {footerLinks.slice(0, 2).map((col) => (
            <div key={col.title}>
              <p className="label mb-3 text-ink-faint">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} onClick={() => setMenu(false)}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className={cn("mt-10 text-[0.72rem] text-ink-faint")}>{site.contact.hours}</p>
      </div>
    </Sheet>
  );
}
