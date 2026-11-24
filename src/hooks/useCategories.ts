import { useEffect, useState } from "react";
import { getCategoryList } from "@/lib/catalog";
import type { CategoryDTO } from "@/lib/api/types";

export function useCategories(): CategoryDTO[] {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);

  useEffect(() => {
    let live = true;
    getCategoryList()
      .then((list) => {
        if (live) setCategories(list);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  return categories;
}
