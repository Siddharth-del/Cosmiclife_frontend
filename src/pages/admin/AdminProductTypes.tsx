import { useMemo, useRef, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { AdminPage, EmptyPanel, ErrorPanel, FilterChips, Panel, Pill, SearchInput, TableSkeleton } from "@/components/admin/AdminUI";
import { td, th } from "@/components/admin/styles";
import { Button } from "@/components/ui/Button";
import { FormStatus, SelectField, TextField } from "@/components/ui/Field";
import { useLoad } from "@/hooks/useLoad";
import { usePageMeta } from "@/hooks/usePageMeta";
import { adminCategoryApi, adminProductTypeApi } from "@/lib/api/admin";
import { byTypeOrder } from "@/lib/api/productTypes";
import type { CategoryDTO, ProductTypeDTO, ProductTypeInput } from "@/lib/api/types";
import { slugify } from "@/lib/admin";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { toast } from "@/store/toast";

interface Values {
  name: string;
  slug: string;
  categoryId: string;
  displayOrder: string;
  active: boolean;
}
type Errors = Partial<Record<keyof Values, string>>;
type Filter = "all" | "active" | "inactive";

const EMPTY: Values = { name: "", slug: "", categoryId: "", displayOrder: "", active: true };

const fromType = (t: ProductTypeDTO): Values => ({
  name: t.name,
  slug: t.slug,
  categoryId: t.categoryId != null ? String(t.categoryId) : "",
  displayOrder: String(t.displayOrder),
  active: t.active !== false,
});

function validate(v: Values, existing: ProductTypeDTO[], editing: ProductTypeDTO | null): Errors {
  const e: Errors = {};
  const name = v.name.trim();
  const slug = v.slug.trim();
  const categoryId = Number(v.categoryId);
  const others = existing.filter((t) => t.productTypeId !== editing?.productTypeId);

  if (!v.categoryId) e.categoryId = "Choose which category this type belongs to.";

  if (!name) e.name = "Enter a type name, e.g. Keyboard.";
  else if (name.length > 80) e.name = "Keep the name to 80 characters or fewer.";
  else if (others.some((t) => t.categoryId === categoryId && t.name.toLowerCase() === name.toLowerCase()))
    e.name = "This category already has a type with that name.";

  if (!slug) e.slug = "Enter a slug, or let it fill in from the name.";
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) e.slug = "Use lowercase letters, numbers and hyphens only.";
  else if (others.some((t) => t.slug.toLowerCase() === slug.toLowerCase())) e.slug = "Another type already uses this slug.";

  if (v.displayOrder && !/^\d{1,4}$/.test(v.displayOrder)) e.displayOrder = "Enter a whole number, or leave blank.";
  return e;
}

const toInput = (v: Values): ProductTypeInput => ({
  name: v.name.trim(),
  slug: v.slug.trim(),
  displayOrder: v.displayOrder ? Number(v.displayOrder) : 0,
  active: v.active,
  categoryId: v.categoryId ? Number(v.categoryId) : null,
});

export default function AdminProductTypes() {
  usePageMeta("Product types · Admin", undefined, { noindex: true });
  const types = useLoad(() => adminProductTypeApi.all());
  const categories = useLoad(() => adminCategoryApi.all());
  const [editing, setEditing] = useState<ProductTypeDTO | "new" | null>(null);
  const [removing, setRemoving] = useState<ProductTypeDTO | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const formRef = useRef<HTMLDivElement>(null);

  const all = useMemo(() => [...(types.data ?? [])].sort(byTypeOrder), [types.data]);
  const cats = useMemo(() => [...(categories.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [categories.data]);

  const counts = useMemo(
    () => ({ all: all.length, active: all.filter((t) => t.active).length, inactive: all.filter((t) => !t.active).length }),
    [all],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((t) => {
      if (filter === "active" && !t.active) return false;
      if (filter === "inactive" && t.active) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.slug.includes(q) || (t.categoryName ?? "").toLowerCase().includes(q);
    });
  }, [all, filter, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProductTypeDTO[]>();
    for (const t of list) {
      const key = t.categoryName ?? "Unassigned";
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [list]);

  const scrollToForm = () => requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  const open = (t: ProductTypeDTO | "new") => {
    setRemoving(null);
    setEditing(t);
    scrollToForm();
  };
  const upsert = (t: ProductTypeDTO) => types.setData((prev) => [...(prev ?? []).filter((x) => x.productTypeId !== t.productTypeId), t]);

  return (
    <AdminPage
      eyebrow="Catalogue"
      title="Product types"
      actions={
        editing === null && removing === null ? (
          <Button type="button" size="sm" onClick={() => open("new")} disabled={!cats.length}>
            <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} /> New type
          </Button>
        ) : undefined
      }
    >
      <div ref={formRef} className="scroll-mt-6">
        {removing !== null && (
          <DeleteConfirm
            type={removing}
            onDone={(deleted) => {
              if (deleted) types.setData((prev) => (prev ?? []).filter((x) => x.productTypeId !== removing.productTypeId));
              setRemoving(null);
            }}
          />
        )}
        {editing !== null && removing === null && (
          <TypeForm
            key={editing === "new" ? "new" : editing.productTypeId}
            type={editing === "new" ? null : editing}
            categories={cats}
            existing={all}
            nextOrder={all.length ? Math.max(...all.map((t) => t.displayOrder)) + 1 : 0}
            onSaved={(saved) => {
              upsert(saved);
              setEditing(null);
            }}
            onClose={() => setEditing(null)}
          />
        )}
      </div>

      <div className={editing !== null || removing !== null ? "mt-8" : undefined}>
        {types.error ? (
          <ErrorPanel error={types.error} onRetry={types.reload} what="product types" />
        ) : !types.data ? (
          <TableSkeleton rows={4} />
        ) : all.length === 0 ? (
          editing === null && (
            <EmptyPanel
              title="No product types yet"
              body="A type sorts products inside a category — Keyboard and Mouse under Electronics, Oud and Floral under Attar. Without any, a category's products show as one undifferentiated grid."
              action={
                <Button type="button" size="sm" onClick={() => open("new")} disabled={!cats.length}>
                  New type
                </Button>
              }
            />
          )
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <FilterChips<Filter>
                label="Filter types"
                value={filter}
                onChange={setFilter}
                options={[
                  { id: "all", label: "All", count: counts.all },
                  { id: "active", label: "Shown", count: counts.active },
                  { id: "inactive", label: "Hidden", count: counts.inactive },
                ]}
              />
              <SearchInput value={query} onChange={setQuery} placeholder="Search types" label="Search product types" />
            </div>

            {list.length === 0 ? (
              <EmptyPanel title="Nothing matches" body="Try a different search or filter." />
            ) : (
              <div className="space-y-8">
                {grouped.map(([categoryName, rows]) => (
                  <section key={categoryName} aria-label={`${categoryName} types`}>
                    <h2 className="label mb-3 text-[0.6rem] text-ink-muted">{categoryName}</h2>
                    <div className="overflow-x-auto border border-hair bg-white/70">
                      <table className="w-full min-w-[44rem]">
                        <thead className="border-b border-hair">
                          <tr>
                            <th className={th}>Type</th>
                            <th className={th}>Slug</th>
                            <th className={th}>Products</th>
                            <th className={th}>Order</th>
                            <th className={th}>Status</th>
                            <th className={th}>
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hair">
                          {rows.map((t) => (
                            <TypeRow key={t.productTypeId} type={t} onEdit={() => open(t)} onSaved={upsert} onDelete={() => { setEditing(null); setRemoving(t); scrollToForm(); }} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AdminPage>
  );
}

function TypeRow({
  type: t,
  onEdit,
  onSaved,
  onDelete,
}: {
  type: ProductTypeDTO;
  onEdit: () => void;
  onSaved: (t: ProductTypeDTO) => void;
  onDelete: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = !t.active;
      onSaved(await adminProductTypeApi.setActive(t, next));
      toast({ title: `${t.name} ${next ? "shown on the store" : "hidden from the store"}` });
    } catch (e) {
      toast({ title: `Couldn't update ${t.name}`, description: errorMessage(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="hover:bg-sand/30">
      <td className={cn(td, "font-medium")}>{t.name}</td>
      <td className={cn(td, "text-[0.8rem] text-ink-muted")}>{t.slug}</td>
      <td className={cn(td, "tabular text-[0.82rem] text-ink-muted")}>
        {t.productCount ?? <span className="text-ink-faint">—</span>}
      </td>
      <td className={cn(td, "tabular text-ink-muted")}>{t.displayOrder}</td>
      <td className={td}>
        <Pill tone={t.active ? "good" : "bad"}>{t.active ? "Shown" : "Hidden"}</Pill>
      </td>
      <td className={cn(td, "whitespace-nowrap text-right")}>
        <button type="button" onClick={onEdit} className="label mr-4 text-[0.58rem] underline-offset-4 hover:underline">
          Edit
        </button>
        <button type="button" onClick={toggle} disabled={busy} className="label mr-4 text-[0.58rem] text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-50">
          {busy ? "Saving" : t.active ? "Hide" : "Show"}
        </button>
        <button type="button" onClick={onDelete} className="label text-[0.58rem] text-[#9b3b2a] underline-offset-4 hover:underline">
          Delete
        </button>
      </td>
    </tr>
  );
}

function DeleteConfirm({ type: t, onDone }: { type: ProductTypeDTO; onDone: (deleted: boolean) => void }) {
  const count = t.productCount;
  const unknown = count == null;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminProductTypeApi.remove(t.productTypeId);
      toast({ title: `${t.name} deleted` });
      onDone(true);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Panel title={`Delete ${t.name}?`}>
      <div className="max-w-xl">
        <p className="text-[0.9rem] text-ink-muted">
          This removes {t.name} from the filters on {t.categoryName ?? "its category"}. It can't be undone.
        </p>
        {(unknown || count > 0) && (
          <p className="mt-3 text-[0.9rem] text-[#9b3b2a]">
            {unknown
              ? "Products may still be filed under it. The server refuses to delete a type that any product still uses — hide it instead to take it out of the filters."
              : `${count} ${count === 1 ? "product is" : "products are"} filed under it. The server will refuse — hide it instead to take it out of the filters.`}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" size="sm" onClick={remove} disabled={busy} aria-busy={busy}>
            {busy ? "Deleting" : "Delete type"}
          </Button>
          <button type="button" onClick={() => onDone(false)} disabled={busy} className="label text-[0.6rem] text-ink-muted hover:text-ink">
            Cancel
          </button>
          <FormStatus error={error} pending={busy} />
        </div>
      </div>
    </Panel>
  );
}

function TypeForm({
  type: t,
  categories,
  existing,
  nextOrder,
  onSaved,
  onClose,
}: {
  type: ProductTypeDTO | null;
  categories: CategoryDTO[];
  existing: ProductTypeDTO[];
  nextOrder: number;
  onSaved: (t: ProductTypeDTO) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Values>(t ? fromType(t) : { ...EMPTY, displayOrder: String(nextOrder) });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!t);

  const set =
    <K extends keyof Values>(k: K) =>
    (v: Values[K]) => {
      setValues((x) => ({ ...x, [k]: v }));
      if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
    };

  const onName = (v: string) => {
    setValues((x) => ({ ...x, name: v, slug: slugTouched ? x.slug : slugify(v) }));
    if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const next = validate(values, existing, t);
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const input = toInput(values);
      const saved = t
        ? await adminProductTypeApi.update(t.productTypeId, input)
        : await adminProductTypeApi.create(Number(values.categoryId), input);
      toast({ title: t ? `${saved.name} saved` : `${saved.name} created` });
      onSaved(saved);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title={t ? `Edit ${t.name}` : "New product type"}>
      <form onSubmit={submit} noValidate aria-label={t ? `Edit product type ${t.name}` : "New product type"} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SelectField label="Category" value={values.categoryId} onChange={set("categoryId")} error={errors.categoryId} hint="A type belongs to one category, and only its products can use it.">
          <option value="">Choose a category</option>
          {categories.map((c) => (
            <option key={c.categoryId} value={String(c.categoryId)}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Name" value={values.name} onChange={onName} error={errors.name} hint="e.g. Keyboard" maxLength={80} />

        <TextField
          label="Slug"
          value={values.slug}
          onChange={(v) => {
            setSlugTouched(true);
            set("slug")(v);
          }}
          error={errors.slug}
          hint="Used in filter links, e.g. /collections/electronics?type=keyboard"
          spellCheck={false}
          autoComplete="off"
        />
        <TextField
          label="Display order"
          inputMode="numeric"
          value={values.displayOrder}
          onChange={(v) => set("displayOrder")(v.replace(/\D/g, ""))}
          error={errors.displayOrder}
          hint="Lower numbers show first in the filters."
        />

        <label className="flex cursor-pointer items-center gap-3 md:col-span-2">
          <input type="checkbox" checked={values.active} onChange={(e) => set("active")(e.target.checked)} className="h-4 w-4 accent-espresso" />
          <span className="text-[0.86rem]">Show this type on the store</span>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:col-span-2">
          <Button type="submit" size="sm" disabled={saving} aria-busy={saving}>
            {saving ? "Saving" : t ? "Save type" : "Create type"}
          </Button>
          <button type="button" onClick={onClose} disabled={saving} className="label text-[0.6rem] text-ink-muted hover:text-ink">
            Cancel
          </button>
          <FormStatus error={formError} pending={saving} />
        </div>
      </form>
    </Panel>
  );
}
