import { useEffect } from "react";
import { useLocation } from "react-router";
import { site } from "@/lib/site";

const DEFAULT_TITLE = `${site.name} | ${site.descriptor}`;

function setMeta(name: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (content === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string | null, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (href === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    if (hreflang) el.hreflang = hreflang;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function usePageMeta(title?: string, description?: string, opts: { noindex?: boolean } = {}) {
  const { noindex = false } = opts;
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = title ? `${title} | ${site.name}` : DEFAULT_TITLE;
    setMeta("description", description ?? site.description);
    setMeta("robots", noindex ? "noindex" : null);

    if (noindex) {
      setLink("canonical", null);
      setLink("alternate", null, "en-IN");
      setLink("alternate", null, "en");
      setLink("alternate", null, "x-default");
      return;
    }
    setLink("canonical", site.url + pathname);
    setLink("alternate", site.domains.IN + pathname, "en-IN");
    setLink("alternate", site.domains.INTL + pathname, "en");
    setLink("alternate", site.domains.IN + pathname, "x-default");
  }, [title, description, noindex, pathname]);
}
