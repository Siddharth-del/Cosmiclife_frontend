import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { AdminPage, EmptyPanel, ErrorPanel, FilterChips, Panel, Pill, SearchInput, TableSkeleton } from "@/components/admin/AdminUI";
import { td, th } from "@/components/admin/styles";
import { Button } from "@/components/ui/Button";
import { FormStatus, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { useLoad } from "@/hooks/useLoad";
import { usePageMeta } from "@/hooks/usePageMeta";
import { adminCategoryApi } from "@/lib/api/admin";
import type { CategoryDTO, CategoryInput, CategoryTheme } from "@/lib/api/types";
import { slugify } from "@/lib/admin";
import { errorMessage } from "@/lib/errors";
import { formatBytes, prepareCategoryIcon, type PreparedImage } from "@/lib/image";
import { formatDateTime } from "@/lib/orders";
import { cn } from "@/lib/cn";
import { toast } from "@/store/toast";

interface Values {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  theme: CategoryTheme;
  sortOrder: string;
  active: boolean;
}
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { name: "", slug: "", description: "", imageUrl: "", theme: "light", sortOrder: "", active: true };

type Filter = "all" | "active" | "inactive";

const fromCategory = (c: CategoryDTO): Values => ({
  name: c.name,
  slug: c.slug,
  description: c.description ?? "",
  imageUrl: c.imageUrl ?? "",
  theme: c.theme === "dark" ? "dark" : "light",
  sortOrder: c.sortOrder != null ? String(c.sortOrder) : "",
  active: c.active !== false,
});

const isUsableImage = (v: string) => /^(https?:\/\/|\/)/i.test(v.trim());

function validate(v: Values, existing: CategoryDTO[], editing: CategoryDTO | null): Errors {
  const e: Errors = {};
  const name = v.name.trim();
  const slug = v.slug.trim();
  const other = existing.filter((c) => c.categoryId !== editing?.categoryId);

  if (!name) e.name = "Enter a category name, e.g. Home Decor.";
  else if (name.length > 80) e.name = "Keep the name to 80 characters or fewer.";
  else if (other.some((c) => c.name.toLowerCase() === name.toLowerCase())) e.name = "A category with this name already exists.";

  if (!slug) e.slug = "Enter a slug, or let it fill in from the name.";
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) e.slug = "Use lowercase letters, numbers and hyphens only.";
  else if (other.some((c) => c.slug.toLowerCase() === slug.toLowerCase())) e.slug = "A category already uses this slug.";

  if (v.imageUrl.trim() && !isUsableImage(v.imageUrl)) e.imageUrl = "Enter a full https:// URL or a path starting with /.";
  if (v.sortOrder && !/^\d{1,4}$/.test(v.sortOrder)) e.sortOrder = "Enter a whole number, or leave blank.";
  if (v.description.length > 1000) e.description = "Keep the description to 1000 characters or fewer.";
  return e;
}

const toInput = (v: Values): CategoryInput => ({
  name: v.name.trim(),
  slug: v.slug.trim(),
  description: v.description.trim() || null,
  imageUrl: v.imageUrl.trim() || null,
  theme: v.theme,
  sortOrder: v.sortOrder ? Number(v.sortOrder) : 0,
  active: v.active,
});

export default function AdminCategories() {
  usePageMeta("Categories · Admin", undefined, { noindex: true });
  const categories = useLoad(() => adminCategoryApi.all());
  const [editing, setEditing] = useState<CategoryDTO | "new" | null>(null);
  const [removing, setRemoving] = useState<CategoryDTO | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const formRef = useRef<HTMLDivElement>(null);

  const all = useMemo(
    () => [...(categories.data ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    [categories.data],
  );

  const counts = useMemo(
    () => ({ all: all.length, active: all.filter((c) => c.active !== false).length, inactive: all.filter((c) => c.active === false).length }),
    [all],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((c) => {
      if (filter === "active" && c.active === false) return false;
      if (filter === "inactive" && c.active !== false) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
    });
  }, [all, filter, query]);

  const open = (c: CategoryDTO | "new") => {
    setRemoving(null);
    setEditing(c);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const upsert = (c: CategoryDTO) => categories.setData((prev) => [...(prev ?? []).filter((x) => x.categoryId !== c.categoryId), c]);

  return (
    <AdminPage
      eyebrow="Catalogue"
      title="Categories"
      actions={
        editing === null && removing === null ? (
          <Button type="button" size="sm" onClick={() => open("new")}>
            <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} /> New category
          </Button>
        ) : undefined
      }
    >
      <div ref={formRef} className="scroll-mt-6">
        {removing !== null && categories.data && (
          <DeleteConfirm
            category={removing}
            onDone={(deleted) => {
              if (deleted) {
                categories.setData((prev) => (prev ?? []).filter((x) => x.categoryId !== removing.categoryId));
                categories.reload();
              }
              setRemoving(null);
            }}
          />
        )}
        {editing !== null && removing === null && categories.data && (
          <CategoryForm
            key={editing === "new" ? "new" : editing.categoryId}
            category={editing === "new" ? null : editing}
            existing={categories.data}
            onDone={(saved) => {
              if (saved) upsert(saved);
              setEditing(null);
            }}
            onUploaded={upsert}
          />
        )}
      </div>

      <div className={editing !== null || removing !== null ? "mt-8" : undefined}>
        {categories.error ? (
          <ErrorPanel error={categories.error} onRetry={categories.reload} what="categories" />
        ) : !categories.data ? (
          <TableSkeleton rows={4} />
        ) : all.length === 0 ? (
          editing === null && (
            <EmptyPanel
              title="No categories yet"
              body="Categories group your products and drive the storefront navigation. Create your first one to get started."
              action={
                <Button type="button" size="sm" onClick={() => open("new")}>
                  New category
                </Button>
              }
            />
          )
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <FilterChips<Filter>
                label="Filter categories"
                value={filter}
                onChange={setFilter}
                options={[
                  { id: "all", label: "All", count: counts.all },
                  { id: "active", label: "Active", count: counts.active },
                  { id: "inactive", label: "Hidden", count: counts.inactive },
                ]}
              />
              <SearchInput value={query} onChange={setQuery} placeholder="Search name or slug" label="Search categories" />
            </div>

            {list.length === 0 ? (
              <EmptyPanel title="Nothing matches" body="Try a different search or filter." />
            ) : (
              <div className="relative overflow-x-auto border border-hair bg-white/70">
                <table className="w-full min-w-[56rem]">
                  <thead className="border-b border-hair">
                    <tr>
                      <th className={th}>Category</th>
                      <th className={th}>Slug</th>
                      <th className={th}>Products</th>
                      <th className={th}>Order</th>
                      <th className={th}>Created</th>
                      <th className={th}>Status</th>
                      <th className={th}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hair">
                    {list.map((c) => (
                      <CategoryRow key={c.categoryId} category={c} onEdit={() => open(c)} onDelete={() => { setEditing(null); setRemoving(c); requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }} onSaved={upsert} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminPage>
  );
}

function CategoryRow({ category: c, onEdit, onDelete, onSaved }: { category: CategoryDTO; onEdit: () => void; onDelete: () => void; onSaved: (c: CategoryDTO) => void }) {
  const [busy, setBusy] = useState(false);

  const setActive = async (active: boolean) => {
    setBusy(true);
    try {
      onSaved(await adminCategoryApi.update(c.categoryId, { ...toInput(fromCategory(c)), active }));
      toast({ title: `${c.name} ${active ? "shown on the store" : "hidden from the store"}` });
    } catch (e) {
      toast({ title: `Couldn't update ${c.name}`, description: errorMessage(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="hover:bg-sand/30">
      <td className={td}>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden border border-hair bg-sand/40">
            {c.imageUrl ? (
              <img src={c.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <span aria-hidden className="text-[0.62rem] uppercase tracking-[0.14em] text-ink-faint">
                {c.name.slice(0, 2)}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block font-medium">{c.name}</span>
            {c.description && <span className="block max-w-[22rem] truncate text-[0.76rem] text-ink-muted">{c.description}</span>}
          </span>
        </div>
      </td>
      <td className={cn(td, "font-mono text-[0.78rem] text-ink-muted")}>{c.slug}</td>
      <td className={cn(td, "tabular")}>{c.productCount ?? 0}</td>
      <td className={cn(td, "tabular text-ink-muted")}>{c.sortOrder ?? 0}</td>
      <td className={cn(td, "text-[0.78rem] text-ink-muted")}>{c.createdAt ? formatDateTime(c.createdAt, false) : "—"}</td>
      <td className={td}>
        <Pill tone={c.active === false ? "bad" : "good"}>{c.active === false ? "Hidden" : "Active"}</Pill>
      </td>
      <td className={cn(td, "whitespace-nowrap text-right")}>
        <button type="button" onClick={onEdit} className="label mr-4 text-[0.58rem] underline-offset-4 hover:underline">
          Edit
        </button>
        <button type="button" onClick={() => setActive(c.active === false)} disabled={busy} className="label mr-4 text-[0.58rem] text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-50">
          {busy ? "Saving" : c.active === false ? "Show" : "Hide"}
        </button>
        <button type="button" onClick={onDelete} className="label text-[0.58rem] text-[#9b3b2a] underline-offset-4 hover:underline">
          Delete
        </button>
      </td>
    </tr>
  );
}

function DeleteConfirm({ category, onDone }: { category: CategoryDTO; onDone: (deleted: boolean) => void }) {
  const count = category.productCount;
  const unknown = count == null;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminCategoryApi.remove(category.categoryId);
      toast({ title: `${category.name} deleted` });
      onDone(true);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Panel title={`Delete ${category.name}?`}>
      <div className="max-w-xl">
        <p className="text-[0.9rem] text-ink-muted">
          This removes {category.name} from the storefront navigation. It can't be undone.
        </p>
        {(unknown || count > 0) && (
          <p className="mt-3 text-[0.9rem] text-[#9b3b2a]">
            {unknown
              ? "Move its products to another category first. The server refuses to delete a category that still holds any."
              : `It still holds ${count} ${count === 1 ? "product" : "products"}. Move them to another category first — the server refuses to delete a category that still holds any.`}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" size="sm" onClick={remove} disabled={busy} aria-busy={busy}>
            {busy ? "Deleting" : "Delete category"}
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

function IconPicker({
  categoryId,
  imageUrl,
  pending,
  onPick,
  onUploaded,
}: {
  categoryId?: number;
  imageUrl: string;
  pending: PreparedImage | null;
  onPick: (image: PreparedImage | null) => void;
  onUploaded: (category: CategoryDTO) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) {
      setPendingUrl(null);
      return;
    }
    const url = URL.createObjectURL(pending.blob);
    setPendingUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pending]);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    let prepared: PreparedImage;
    try {
      prepared = await prepareCategoryIcon(file);
    } catch (e) {
      setError(errorMessage(e));
      return;
    }

    if (categoryId == null) {
      onPick(prepared);
      return;
    }

    setBusy(true);
    try {
      const saved = await adminCategoryApi.uploadIcon(categoryId, prepared);
      onUploaded(saved);
      onPick(null);
      toast({ title: "Image uploaded" });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const shown = pendingUrl ?? (imageUrl.trim() && isUsableImage(imageUrl) ? imageUrl.trim() : null);

  return (
    <div>
      <span className="label text-ink-muted">Category image</span>
      <div className="mt-3 flex items-start gap-4">
        {shown ? (
          <img src={shown} alt="" className="h-20 w-28 shrink-0 border border-hair object-cover" />
        ) : (
          <span className="grid h-20 w-28 shrink-0 place-items-center border border-dashed border-hair text-[0.6rem] uppercase tracking-[0.14em] text-ink-faint">
            None
          </span>
        )}
        <div className="min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={busy} aria-busy={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Uploading" : shown ? "Replace image" : "Upload image"}
          </Button>
          <p className="mt-2 text-[0.76rem] text-ink-muted">
            {pending
              ? `${pending.filename} · ${formatBytes(pending.blob.size)} — uploads when you save.`
              : categoryId == null
                ? "JPEG, PNG or WebP, at least 64 \u00d7 64. It uploads once the category is created."
                : "JPEG, PNG or WebP, at least 64 \u00d7 64. Large images are resized before uploading."}
          </p>
          {error && <p className="mt-2 text-[0.78rem] text-[#9b3b2a]">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function CategoryForm({ category, existing, onDone, onUploaded }: { category: CategoryDTO | null; existing: CategoryDTO[]; onDone: (saved?: CategoryDTO) => void; onUploaded: (c: CategoryDTO) => void }) {
  const [values, setValues] = useState<Values>(category ? fromCategory(category) : EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!category);
  const [pendingIcon, setPendingIcon] = useState<PreparedImage | null>(null);

  const set =
    <K extends keyof Values>(k: K) =>
    (v: Values[K]) => {
      setValues((x) => ({ ...x, [k]: v }));
      if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
    };

  const setName = (v: string) => {
    setValues((x) => ({ ...x, name: v, slug: slugTouched ? x.slug : slugify(v) }));
    if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const next = validate(values, existing, category);
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const input = toInput(values);
      let saved = category ? await adminCategoryApi.update(category.categoryId, input) : await adminCategoryApi.create(input);

      if (pendingIcon) {
        try {
          saved = await adminCategoryApi.uploadIcon(saved.categoryId, pendingIcon);
          setPendingIcon(null);
        } catch (uploadError) {
          toast({ title: `${saved.name} saved, but the image didn't upload`, description: errorMessage(uploadError), tone: "error" });
          onDone(saved);
          return;
        }
      }

      toast({ title: category ? `${saved.name} saved` : `${saved.name} created` });
      onDone(saved);
    } catch (err) {
      setFormError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Panel title={category ? `Edit ${category.name}` : "New category"}>
      <form onSubmit={submit} noValidate aria-label={category ? `Edit category ${category.name}` : "New category"} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField label="Name" value={values.name} onChange={setName} error={errors.name} hint="Shown in navigation and on category cards." maxLength={80} autoComplete="off" />
        <TextField
          label="Slug"
          value={values.slug}
          onChange={(v) => {
            setSlugTouched(true);
            set("slug")(v.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-"));
          }}
          error={errors.slug}
          hint={category ? "Changing this changes the category's URL." : "Used in the URL: /collections/your-slug"}
          maxLength={100}
          spellCheck={false}
          autoComplete="off"
        />
        <TextAreaField label="Description" value={values.description} onChange={set("description")} error={errors.description} hint="One or two lines, shown on the category card." maxLength={1000} className="md:col-span-2" />
        <IconPicker
          categoryId={category?.categoryId}
          imageUrl={values.imageUrl}
          pending={pendingIcon}
          onPick={setPendingIcon}
          onUploaded={(c) => {
            set("imageUrl")(c.imageUrl ?? "");
            onUploaded(c);
          }}
        />
        <TextField label="Or paste an image URL" value={values.imageUrl} onChange={set("imageUrl")} error={errors.imageUrl} hint="A full https:// URL, or a path like /images/campaign/cat-attar.webp" spellCheck={false} autoComplete="off" />
        <SelectField label="Card theme" value={values.theme} onChange={(v) => set("theme")(v === "dark" ? "dark" : "light")} hint="Dark suits deep, oriental imagery. Light suits bright product shots.">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </SelectField>
        <TextField label="Display order" inputMode="numeric" value={values.sortOrder} onChange={(v) => set("sortOrder")(v.replace(/\D/g, ""))} error={errors.sortOrder} hint="Lower numbers come first. Blank counts as 0." />
        <label className="flex cursor-pointer items-center gap-3 md:col-span-2">
          <input type="checkbox" checked={values.active} onChange={(e) => set("active")(e.target.checked)} className="h-4 w-4 accent-espresso" />
          <span className="text-[0.88rem]">Show on the storefront</span>
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:col-span-2">
          <Button type="submit" size="sm" disabled={saving} aria-busy={saving}>
            {saving
              ? pendingIcon
                ? "Saving & uploading"
                : "Saving"
              : category
                ? pendingIcon
                  ? "Save & upload image"
                  : "Save category"
                : pendingIcon
                  ? "Create & upload image"
                  : "Create category"}
          </Button>
          <button type="button" onClick={() => onDone()} disabled={saving} className="label text-[0.6rem] text-ink-muted hover:text-ink">
            Cancel
          </button>
          <FormStatus error={formError} pending={saving} />
        </div>
      </form>
    </Panel>
  );
}
