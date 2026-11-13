import { useEffect, useState } from "react";
import { getApiCategories } from "@/lib/catalog";
import type { CategoryDTO } from "@/lib/api/types";

export function useCategories(): CategoryDTO[] {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);

  useEffect(() => {
    let live = true;
    getApiCategories().then((list) => {
      if (live) setCategories(list);
    });
    return () => {
      live = false;
    };
  }, []);

  return categories;
}
